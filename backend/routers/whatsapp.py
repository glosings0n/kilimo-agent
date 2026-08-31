import os
import re
import json
import uuid
import shutil
import urllib.request
from typing import Optional, Dict, Any, Union
from fastapi import APIRouter, Request, Response, UploadFile, File, Form, Query, HTTPException, status
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel, Field

from agent import process_multimodal_harvest_request, process_conversational_intake
from receptionist_agent import run_receptionist_triage, _is_reset_or_new_request, _is_pure_greeting
from guardrails.gemma_guard import GemmaModelArmor

router = APIRouter()

UPLOAD_DIR = "/tmp/kilimo_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Configuration from Environment Variables
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "kilimo_token_secret_123")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "+14155238886")

gemma_armor = GemmaModelArmor()


class WhatsAppSessionStore:
    """
    In-memory stateful multi-turn session storage per phone number.
    Tracks accumulated crop, volume_kg, origin_depot, destination_preference, and conversation history.
    """
    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def get_session(self, phone: str) -> Dict[str, Any]:
        clean_phone = (phone or "").strip()
        if clean_phone not in self._sessions:
            self._sessions[clean_phone] = {
                "crop": None,
                "volume_kg": None,
                "origin_depot": None,
                "destination_preference": None,
                "history": []
            }
        return self._sessions[clean_phone]

    def update_params(self, phone: str, new_params: Dict[str, Any]):
        session = self.get_session(phone)
        for k in ["crop", "volume_kg", "origin_depot", "destination_preference"]:
            if k in new_params and new_params[k] is not None:
                session[k] = new_params[k]

    def add_history(self, phone: str, role: str, text: str):
        session = self.get_session(phone)
        session["history"].append({"role": role, "text": text})

    def clear_session(self, phone: str):
        clean_phone = (phone or "").strip()
        if clean_phone in self._sessions:
            del self._sessions[clean_phone]


whatsapp_sessions = WhatsAppSessionStore()


def _format_conversational_reply(
    reply_text: str,
    language: str = "en",
    is_initial: bool = False
) -> str:
    """Formats receptionist triage clarification messages for mobile WhatsApp (fluid, human-like dialogue)."""
    clean_text = reply_text.strip()
    if is_initial:
        if language == "sw":
            header = "🌾 *KILIMOAGENT: MAPOKEZI YA MKULIMA*"
            footer = "🌾 _KilimoAgent - Kukuza kilimo cha kisasa barani Afrika._"
        elif language == "fr":
            header = "🌾 *KILIMOAGENT: ACCUEIL & ORIENTATION*"
            footer = "🌾 _KilimoAgent - L'intelligence agricole au service des producteurs._"
        else:
            header = "🌾 *KILIMOAGENT: RECEPTION & INTAKE*"
            footer = "🌾 _KilimoAgent - Autonomous Agritech & Logistics for Africa._"

        return (
            f"{header}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"{clean_text}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"{footer}"
        )

    # Clean, direct conversational text for all intermediate chat turns
    return clean_text


def send_twilio_whatsapp_message(
    to_phone_number: str,
    message_body: str,
    media_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatches an authentic outbound WhatsApp message using the official Twilio REST API client.
    Maintains full backward-compatible mock/simulation fallback when Twilio credentials are not active or in dev mode.
    """
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        return {
            "dispatched": False,
            "mode": "SIMULATION",
            "reason": "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured."
        }

    try:
        from twilio.rest import Client
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

        from_wa = TWILIO_WHATSAPP_NUMBER
        if not from_wa.startswith("whatsapp:"):
            from_wa = f"whatsapp:{from_wa}"

        clean_to = to_phone_number.strip()
        if not clean_to.startswith("whatsapp:"):
            clean_to = f"whatsapp:{clean_to}"

        create_kwargs: Dict[str, Any] = {
            "from_": from_wa,
            "to": clean_to,
            "body": message_body
        }
        if media_url:
            create_kwargs["media_url"] = [media_url]

        message = twilio_client.messages.create(**create_kwargs)
        return {
            "dispatched": True,
            "mode": "TWILIO_REST_API",
            "message_sid": message.sid,
            "status": message.status,
            "to": clean_to,
            "from": from_wa
        }
    except Exception as exc:
        print(f"[TWILIO DISPATCH] Live dispatch skipped or failed: {exc}. Retaining simulation mode.")
        return {
            "dispatched": False,
            "mode": "SIMULATION_FALLBACK",
            "error": str(exc)
        }


def _detect_language(text: str) -> str:
    """
    Detects if the text is Swahili, French, or defaults to English.
    """
    if not text:
        return "en"
    
    text_lower = text.lower()
    
    # Swahili indicators
    swahili_keywords = [
        "habari", "jambo", "hujambo", "sijambo", "asante", "shamba", "mahindi",
        "gunia", "magunia", "kilo", "muhogo", "nyanya", "maharagwe", "bei",
        "usafiri", "pesa", "tafadhali", "nipo", "tuma", "soko", "gharama",
        "malipo", "kitale", "eldoret", "mombasa", "nakuru", "nairobi", "arusha",
        "dodoma", "mwanza", "kilimo", "mavuno"
    ]
    sw_score = sum(1 for kw in swahili_keywords if kw in text_lower)
    
    # French indicators
    french_keywords = [
        "bonjour", "salut", "merci", "champ", "maïs", "manioc", "tomates",
        "haricots", "prix", "transport", "argent", "s'il vous plaît", "svp",
        "récolte", "sac", "sacs", "marché", "coût", "paiement", "kilo",
        "goma", "bukavu", "kinshasa", "lubumbashi", "bunia", "agricole",
        "tonnes", "camion"
    ]
    fr_score = sum(1 for kw in french_keywords if kw in text_lower)
    
    if sw_score > fr_score and sw_score > 0:
        return "sw"
    elif fr_score > sw_score and fr_score > 0:
        return "fr"
    return "en"


def _format_whatsapp_message(
    agent_output: str,
    language: str = "en",
    sender_phone: str = "",
    waybill_id: Optional[str] = None
) -> str:
    """
    Formats raw agent output into a clean, mobile-optimized WhatsApp response
    with appropriate language localization (Swahili, French, English) and emojis.
    """
    # Extract Waybill if present in output
    wb_match = re.search(r'KILIMO-WB-[A-Z0-9]+', agent_output)
    extracted_waybill = wb_match.group(0) if wb_match else (waybill_id or f"KILIMO-WB-{uuid.uuid4().hex[:8].upper()}")

    # Extract Origin Depot and Destination Hub
    orig_match = re.search(r'(?:Origin Depot|Pickup Location|Origin|Point de collecte|Départ)[:\s*]+([^\n\r,]+)', agent_output, re.IGNORECASE)
    orig_depot = orig_match.group(1).strip().replace("*", "") if orig_match else "Dépôt d'Origine"

    dest_match = re.search(r'(?:Selected Destination|Destination Hub|Hub Selected|Target Market)[:\s*]+([^\n\r,]+)', agent_output, re.IGNORECASE)
    dest_hub = dest_match.group(1).strip().replace("*", "") if dest_match else "Marché Régional"

    net_match = re.search(r'(?:Net (?:Payout|Revenue|Profit)|Net Earnings)[:\s*]+([$\d.,]+)', agent_output, re.IGNORECASE)
    net_val = net_match.group(1).strip() if net_match else "Calculé au Grand Livre"

    # Redact any remaining PII in the output
    clean_output = gemma_armor.anonymize_pii(agent_output)

    if language == "sw":
        greeting = "🌾 *KILIMOAGENT: RIPOTI YA MAVUNO NA USAFIRI*"
        summary_header = "📋 *Muhtasari wa Makubaliano ya Soko & Usafirishaji:*"
        kpi_lines = (
            f"📦 *Nambari ya Waybill:* `{extracted_waybill}`\n"
            f"📍 *Kituo cha Makusanyo (Asili):* *{orig_depot}*\n"
            f"🎯 *Soko Lililopendekezwa (Mwisho):* *{dest_hub}*\n"
            f"💰 *Mapato Halisi ya Mkulima:* *{net_val}*"
        )
        instructions = (
            "\n📌 *Maagizo ya Mkulima:*\n"
            f"1. Weka mzigo wako tayari kwenye kituo cha *{orig_depot}*.\n"
            f"2. Dereva wa gari atathibitisha Nambari ya Waybill (*{extracted_waybill}*) kabla ya kusafirisha hadi *{dest_hub}*.\n"
            "3. Malipo ya moja kwa moja yatatolewa mara tu ukaguzi wa mwisho utakapokamilika sokoni.\n\n"
            "🌾 _KilimoAgent - Kukuza kilimo cha kisasa barani Afrika._"
        )
    elif language == "fr":
        greeting = "🌾 *KILIMOAGENT: RAPPORT DE RÉCOLTE ET LOGISTIQUE*"
        summary_header = "📋 *Synthèse d'Arbitrage Marché & Expédition:*"
        kpi_lines = (
            f"📦 *Réf. Lettre de Voiture :* `{extracted_waybill}`\n"
            f"📍 *Point de Collecte (Départ) :* *{orig_depot}*\n"
            f"🎯 *Marché Cible Recommandé (Arrivée) :* *{dest_hub}*\n"
            f"💰 *Revenu Net Producteur :* *{net_val}*"
        )
        instructions = (
            "\n📌 *Instructions pour le Producteur:*\n"
            f"1. Veuillez préparer votre récolte au point de collecte (*{orig_depot}*).\n"
            f"2. Le transporteur vérifiera le numéro de lettre de voiture (*{extracted_waybill}*) pour acheminer le stock vers *{dest_hub}*.\n"
            "3. Le versement sera débloqué immédiatement après la confirmation de pesée au terminal.\n\n"
            "🌾 _KilimoAgent - L'intelligence agricole au service des producteurs._"
        )
    else:  # English default
        greeting = "🌾 *KILIMOAGENT: HARVEST ARBITRAGE & FREIGHT REPORT*"
        summary_header = "📋 *Executive Dispatch & Market Summary:*"
        kpi_lines = (
            f"📦 *Waybill Ref:* `{extracted_waybill}`\n"
            f"📍 *Origin Depot (Pickup):* *{orig_depot}*\n"
            f"🎯 *Recommended Market (Destination):* *{dest_hub}*\n"
            f"💰 *Net Farmer Outcome:* *{net_val}*"
        )
        instructions = (
            "\n📌 *Next Steps for Farmer:*\n"
            f"1. Keep harvest securely staged at *{orig_depot}* depot.\n"
            f"2. Carrier will verify Waybill (*{extracted_waybill}*) for transit to *{dest_hub}*.\n"
            "3. Direct settlement will be disbursed upon receipt & grade validation at destination.\n\n"
            "🌾 _KilimoAgent - Autonomous Agritech & Logistics for Africa._"
        )

    formatted_msg = (
        f"{greeting}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"{kpi_lines}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"{summary_header}\n\n"
        f"{clean_output}\n\n"
        f"━━━━━━━━━━━━━━━━━━━━"
        f"{instructions}"
    )

    return formatted_msg


class WhatsAppSimulationRequest(BaseModel):
    phone_number: Optional[str] = Field("+254712345678", description="Farmer WhatsApp phone number")
    message_text: Optional[str] = Field("Habari, nina magunia 50 ya mahindi (kilo 4,500) hapa Kitale, tafadhali nisaidie kuuza na usafiri.", description="WhatsApp text or voice transcription")
    language: Optional[str] = Field("auto", description="'sw' for Swahili, 'fr' for French, 'en' for English, or 'auto'")
    crop: Optional[str] = Field(None, description="Crop name (e.g. maize, cassava, tomatoes, beans)")
    volume_kg: Optional[float] = Field(None, description="Total harvest volume in KG")
    location: Optional[str] = Field(None, description="Pickup location or depot name")
    image_url: Optional[str] = Field(None, description="URL or local path to sample harvest image")
    audio_url: Optional[str] = Field(None, description="URL or local path to sample voice note")
    notes: Optional[str] = Field(None, description="Optional extra notes")


@router.get("/webhook")
async def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge")
):
    """
    Verification endpoint for Meta WhatsApp Cloud API Webhook.
    Returns hub.challenge when hub.verify_token matches.
    """
    if hub_mode == "subscribe" and hub_verify_token == WHATSAPP_VERIFY_TOKEN:
        return PlainTextResponse(content=hub_challenge or "", status_code=200)
    
    # Return 403 if token does not match
    return Response(content="Verification token mismatch", status_code=status.HTTP_403_FORBIDDEN)


@router.post("/webhook")
async def receive_whatsapp_webhook(request: Request):
    """
    Unified WhatsApp Webhook Handler:
    Supports both Meta WhatsApp Cloud API (JSON) and Twilio WhatsApp Sandbox (Form data).
    Performs multi-turn conversational intake and auto-executes dispatch when ready.
    """
    content_type = request.headers.get("content-type", "")
    session_id = uuid.uuid4().hex[:8]
    temp_image_path = None
    temp_audio_path = None

    try:
        # Case 1: Twilio WhatsApp Sandbox (Form URL-Encoded)
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form_data = await request.form()
            from_number = str(form_data.get("From", "")).replace("whatsapp:", "").strip() or f"WA-{session_id}"
            body_text = str(form_data.get("Body", "")).strip()
            num_media = int(form_data.get("NumMedia", 0) or 0)
            
            media_url = str(form_data.get("MediaUrl0", "")).strip() if num_media > 0 else None
            media_content_type = str(form_data.get("MediaContentType0", "")).strip() if num_media > 0 else ""

            # Download media if present from Twilio
            if media_url:
                if "image" in media_content_type:
                    temp_image_path = os.path.join(UPLOAD_DIR, f"{session_id}_twilio_img.jpg")
                    urllib.request.urlretrieve(media_url, temp_image_path)
                elif "audio" in media_content_type or "video" in media_content_type or "ogg" in media_content_type:
                    temp_audio_path = os.path.join(UPLOAD_DIR, f"{session_id}_twilio_audio.mp4")
                    urllib.request.urlretrieve(media_url, temp_audio_path)

            detected_lang = _detect_language(body_text)
            
            # Reset session on fresh intake / restart / greeting
            if _is_reset_or_new_request(body_text) or _is_pure_greeting(body_text):
                whatsapp_sessions.clear_session(from_number)
                session_state = {}
            else:
                session_state = whatsapp_sessions.get_session(from_number)

            current_params = {
                "crop": session_state.get("crop"),
                "volume_kg": session_state.get("volume_kg"),
                "origin_depot": session_state.get("origin_depot"),
                "destination_preference": session_state.get("destination_preference")
            }

            # Execute conversational intake
            intake_res = await process_conversational_intake(
                user_id=from_number,
                session_id=from_number,
                message=body_text,
                current_params=current_params,
                image_source=temp_image_path,
                audio_source=temp_audio_path,
                notes=body_text if body_text else None,
                preferred_language=detected_lang,
                execute_on_ready=True
            )

            # Update accumulated session parameters
            whatsapp_sessions.update_params(from_number, intake_res.get("extracted_params", {}))
            whatsapp_sessions.add_history(from_number, "user", body_text)

            if intake_res.get("is_ready") and intake_res.get("dispatch_outcome"):
                report = intake_res["dispatch_outcome"]["executive_report"]
                reply_msg = _format_whatsapp_message(
                    agent_output=report,
                    language=detected_lang,
                    sender_phone=from_number
                )
                whatsapp_sessions.clear_session(from_number)
            else:
                reply_msg = _format_conversational_reply(
                    reply_text=intake_res.get("reply", ""),
                    language=detected_lang
                )
                whatsapp_sessions.add_history(from_number, "assistant", reply_msg)

            # Return Twilio TwiML XML response
            twiml_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>
        <Body><![CDATA[{reply_msg}]]></Body>
    </Message>
</Response>"""
            return Response(content=twiml_xml, media_type="application/xml")

        # Case 2: Meta WhatsApp Cloud API (JSON Payload)
        else:
            payload = await request.json()
            entry = payload.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            val = changes.get("value", {})
            messages = val.get("messages", [])

            if not messages:
                return JSONResponse({"status": "NO_MESSAGE_TO_PROCESS"})

            msg = messages[0]
            from_number = msg.get("from", f"WA-{session_id}")
            msg_type = msg.get("type", "text")
            
            text_body = ""
            if msg_type == "text":
                text_body = msg.get("text", {}).get("body", "")
            elif msg_type == "location":
                loc = msg.get("location", {})
                text_body = f"Shared Location: Lat {loc.get('latitude')}, Long {loc.get('longitude')}, Name: {loc.get('name', 'Depot')}"

            detected_lang = _detect_language(text_body)

            session_state = whatsapp_sessions.get_session(from_number)
            current_params = {
                "crop": session_state.get("crop"),
                "volume_kg": session_state.get("volume_kg"),
                "origin_depot": session_state.get("origin_depot"),
                "destination_preference": session_state.get("destination_preference")
            }

            intake_res = await process_conversational_intake(
                user_id=from_number,
                session_id=from_number,
                message=text_body,
                current_params=current_params,
                image_source=temp_image_path,
                audio_source=temp_audio_path,
                notes=text_body if text_body else None,
                preferred_language=detected_lang,
                execute_on_ready=True
            )

            whatsapp_sessions.update_params(from_number, intake_res.get("extracted_params", {}))
            whatsapp_sessions.add_history(from_number, "user", text_body)

            if intake_res.get("is_ready") and intake_res.get("dispatch_outcome"):
                report = intake_res["dispatch_outcome"]["executive_report"]
                reply_msg = _format_whatsapp_message(
                    agent_output=report,
                    language=detected_lang,
                    sender_phone=from_number
                )
                whatsapp_sessions.clear_session(from_number)
            else:
                reply_msg = _format_conversational_reply(
                    reply_text=intake_res.get("reply", ""),
                    language=detected_lang
                )
                whatsapp_sessions.add_history(from_number, "assistant", reply_msg)

            return JSONResponse({
                "status": "EVENT_RECEIVED",
                "processed": True,
                "sender": from_number,
                "detected_language": detected_lang,
                "reply": reply_msg,
                "is_ready": intake_res.get("is_ready", False),
                "extracted_params": intake_res.get("extracted_params", {})
            })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "ERROR", "detail": str(e)}
        )
    finally:
        if temp_image_path and os.path.exists(temp_image_path):
            try: os.remove(temp_image_path)
            except Exception: pass
        if temp_audio_path and os.path.exists(temp_audio_path):
            try: os.remove(temp_audio_path)
            except Exception: pass


@router.post("/simulate")
async def simulate_whatsapp_interaction(
    phone_number: Optional[str] = Form("+254712345678"),
    message_text: Optional[str] = Form(None),
    language: Optional[str] = Form("auto"),
    crop: Optional[str] = Form(None),
    volume_kg: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    audio_url: Optional[str] = Form(None)
):
    """
    Simulation test endpoint for UI, Swagger, and cURL testing.
    Maintains multi-turn stateful session per phone number and auto-dispatches when ready.
    """
    session_id = uuid.uuid4().hex[:8]
    temp_image_path = None
    temp_audio_path = None

    try:
        # Handle Image
        if image and image.filename:
            ext = os.path.splitext(image.filename)[1] or ".jpg"
            temp_image_path = os.path.join(UPLOAD_DIR, f"{session_id}_sim_img{ext}")
            with open(temp_image_path, "wb") as buf:
                shutil.copyfileobj(image.file, buf)
        elif image_url and os.path.exists(image_url):
            temp_image_path = image_url

        # Handle Audio
        if audio and audio.filename:
            ext = os.path.splitext(audio.filename)[1] or ".mp4"
            temp_audio_path = os.path.join(UPLOAD_DIR, f"{session_id}_sim_aud{ext}")
            with open(temp_audio_path, "wb") as buf:
                shutil.copyfileobj(audio.file, buf)
        elif audio_url and os.path.exists(audio_url):
            temp_audio_path = audio_url

        # Parse volume
        vol_float = None
        if volume_kg and str(volume_kg).strip():
            try:
                vol_float = float(str(volume_kg).strip())
            except ValueError:
                vol_float = None

        combined_text = f"{message_text or ''} {notes or ''}".strip()
        selected_lang = language if language in ["sw", "fr", "en"] else _detect_language(combined_text)

        target_phone = phone_number or f"SIM-{session_id}"
        
        # Detect fresh start or new harvest request
        if _is_reset_or_new_request(combined_text) or _is_pure_greeting(combined_text):
            whatsapp_sessions.clear_session(target_phone)
            session_state = {}
        else:
            session_state = whatsapp_sessions.get_session(target_phone)

        current_params = {
            "crop": (crop.strip() if crop and crop.strip() else None) or session_state.get("crop"),
            "volume_kg": vol_float or session_state.get("volume_kg"),
            "origin_depot": (location.strip() if location and location.strip() else None) or session_state.get("origin_depot"),
            "destination_preference": session_state.get("destination_preference")
        }

        # Run multi-turn conversational intake
        intake_res = await process_conversational_intake(
            user_id=target_phone,
            session_id=target_phone,
            message=combined_text,
            current_params=current_params,
            image_source=temp_image_path,
            audio_source=temp_audio_path,
            notes=combined_text if combined_text else None,
            preferred_language=selected_lang,
            execute_on_ready=True
        )

        whatsapp_sessions.update_params(target_phone, intake_res.get("extracted_params", {}))
        whatsapp_sessions.add_history(target_phone, "user", combined_text)

        if intake_res.get("is_ready") and intake_res.get("dispatch_outcome"):
            agent_report = intake_res["dispatch_outcome"]["executive_report"]
            formatted_whatsapp = _format_whatsapp_message(
                agent_output=agent_report,
                language=selected_lang,
                sender_phone=target_phone
            )
            whatsapp_sessions.clear_session(target_phone)
        else:
            agent_report = intake_res.get("reply", "")
            formatted_whatsapp = _format_conversational_reply(
                reply_text=agent_report,
                language=selected_lang
            )
            whatsapp_sessions.add_history(target_phone, "assistant", formatted_whatsapp)

        return {
            "success": True,
            "sender": target_phone,
            "detected_language": selected_lang,
            "whatsapp_message": formatted_whatsapp,
            "raw_agent_report": agent_report,
            "extracted_params": intake_res.get("extracted_params", {}),
            "missing_fields": intake_res.get("missing_fields", []),
            "genui_widgets": intake_res.get("genui_widgets", []),
            "is_ready": intake_res.get("is_ready", False),
            "has_image": bool(temp_image_path),
            "has_audio": bool(temp_audio_path)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_image_path and temp_image_path.startswith(UPLOAD_DIR) and os.path.exists(temp_image_path):
            try: os.remove(temp_image_path)
            except Exception: pass
        if temp_audio_path and temp_audio_path.startswith(UPLOAD_DIR) and os.path.exists(temp_audio_path):
            try: os.remove(temp_audio_path)
            except Exception: pass


@router.post("/simulate_json")
async def simulate_whatsapp_interaction_json(payload: WhatsAppSimulationRequest):
    """
    JSON-based Simulation endpoint for programmatic integrations and API tests.
    Maintains multi-turn stateful session per phone number.
    """
    session_id = uuid.uuid4().hex[:8]
    combined_text = f"{payload.message_text or ''} {payload.notes or ''}".strip()
    
    selected_lang = payload.language if payload.language in ["sw", "fr", "en"] else _detect_language(combined_text)

    img_path = payload.image_url if (payload.image_url and os.path.exists(payload.image_url)) else None
    aud_path = payload.audio_url if (payload.audio_url and os.path.exists(payload.audio_url)) else None

    target_phone = payload.phone_number or f"SIM-{session_id}"
    
    if _is_reset_or_new_request(combined_text) or _is_pure_greeting(combined_text):
        whatsapp_sessions.clear_session(target_phone)
        session_state = {}
    else:
        session_state = whatsapp_sessions.get_session(target_phone)

    current_params = {
        "crop": (payload.crop.strip() if payload.crop and payload.crop.strip() else None) or session_state.get("crop"),
        "volume_kg": payload.volume_kg or session_state.get("volume_kg"),
        "origin_depot": (payload.location.strip() if payload.location and payload.location.strip() else None) or session_state.get("origin_depot"),
        "destination_preference": session_state.get("destination_preference")
    }

    intake_res = await process_conversational_intake(
        user_id=target_phone,
        session_id=target_phone,
        message=combined_text,
        current_params=current_params,
        image_source=img_path,
        audio_source=aud_path,
        notes=combined_text if combined_text else None,
        preferred_language=selected_lang,
        execute_on_ready=True
    )

    whatsapp_sessions.update_params(target_phone, intake_res.get("extracted_params", {}))
    whatsapp_sessions.add_history(target_phone, "user", combined_text)

    if intake_res.get("is_ready") and intake_res.get("dispatch_outcome"):
        agent_report = intake_res["dispatch_outcome"]["executive_report"]
        formatted_whatsapp = _format_whatsapp_message(
            agent_output=agent_report,
            language=selected_lang,
            sender_phone=target_phone
        )
        whatsapp_sessions.clear_session(target_phone)
    else:
        agent_report = intake_res.get("reply", "")
        formatted_whatsapp = _format_conversational_reply(
            reply_text=agent_report,
            language=selected_lang
        )
        whatsapp_sessions.add_history(target_phone, "assistant", formatted_whatsapp)

    return {
        "success": True,
        "sender": target_phone,
        "detected_language": selected_lang,
        "whatsapp_message": formatted_whatsapp,
        "raw_agent_report": agent_report,
        "extracted_params": intake_res.get("extracted_params", {}),
        "missing_fields": intake_res.get("missing_fields", []),
        "genui_widgets": intake_res.get("genui_widgets", []),
        "is_ready": intake_res.get("is_ready", False),
        "has_image": bool(img_path),
        "has_audio": bool(aud_path)
    }


class SessionResetRequest(BaseModel):
    phone_number: str = Field("+254712345678", description="Target phone number session to reset")


@router.post("/session/reset")
async def reset_whatsapp_session(payload: SessionResetRequest):
    """Resets conversational memory for a phone number."""
    whatsapp_sessions.clear_session(payload.phone_number)
    return {
        "success": True,
        "phone_number": payload.phone_number,
        "message": "Session reset successfully"
    }


@router.get("/session/{phone_number}")
async def get_whatsapp_session_info(phone_number: str):
    """Retrieves current in-memory multi-turn session state for a phone number."""
    session = whatsapp_sessions.get_session(phone_number)
    return {
        "success": True,
        "phone_number": phone_number,
        "session": session
    }


class WhatsAppDirectSendRequest(BaseModel):
    to_phone_number: str = Field("+254712345678", description="Target recipient WhatsApp phone number")
    message_body: str = Field(..., description="Message text or formatted notification to dispatch")
    media_url: Optional[str] = Field(None, description="Optional image/media attachment URL")


@router.post("/send")
async def send_whatsapp_message_direct(payload: WhatsAppDirectSendRequest):
    """
    Direct WhatsApp dispatch endpoint using Twilio REST API client with simulation fallback.
    """
    result = send_twilio_whatsapp_message(
        to_phone_number=payload.to_phone_number,
        message_body=payload.message_body,
        media_url=payload.media_url
    )
    return {
        "success": result.get("dispatched", False) or result.get("mode") == "SIMULATION",
        "result": result
    }

