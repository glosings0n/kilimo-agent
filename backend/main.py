import os
import shutil
import uuid
import json
from dotenv import load_dotenv

load_dotenv()
from typing import Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from agent import process_multimodal_harvest_request, process_conversational_intake
from receptionist_agent import run_receptionist_triage
from routers.whatsapp import router as whatsapp_router
from routers.live import router as live_router
from state.firestore_manager import KilimoStateManager

app = FastAPI(
    title="KilimoAgent Enterprise Orchestrator API",
    description="Autonomous agricultural commodity arbitrage and freight dispatch engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(whatsapp_router, prefix="/api/v1/whatsapp", tags=["WhatsApp"])
app.include_router(live_router, prefix="/api/v1/live", tags=["Gemini Live"])

UPLOAD_DIR = "/tmp/kilimo_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _clean_str(val: Optional[str]) -> Optional[str]:
    """Converts empty strings or whitespace-only inputs to None."""
    if val is None:
        return None
    cleaned = str(val).strip()
    return cleaned if cleaned else None

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

class IntakeChatRequest(BaseModel):
    user_id: Optional[str] = "web_farmer"
    session_id: Optional[str] = "web_session"
    message: str
    current_params: Optional[Dict[str, Any]] = None
    lang: Optional[str] = "en"
    execute_on_ready: Optional[bool] = True


@app.get("/health", response_model=HealthResponse)
def health_check():
    return {
        "status": "HEALTHY",
        "service": "KilimoAgent Backend Service",
        "version": "1.0.0"
    }


@app.post("/api/v1/intake/chat")
async def conversational_intake_chat(
    request: Request,
    user_id: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    message: Optional[str] = Form(None),
    preferred_language: Optional[str] = Form(None),
    lang: Optional[str] = Form(None),
    current_params: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    audio_url: Optional[str] = Form(None),
    execute_on_ready: Optional[bool] = Form(True)
):
    """
    Receptionist & Triage Chat Endpoint:
    Accepts farmer messages, multimodal images & audios, performs intelligent variable extraction & visual analysis,
    returns conversational replies with Generative UI (GenUI) widget metadata.
    """
    content_type = request.headers.get("content-type", "")
    
    target_user_id = user_id
    target_session_id = session_id
    target_msg = message or ""
    target_lang = lang or preferred_language or "auto"
    target_params = {}
    target_image_bytes = None
    target_audio_bytes = None
    target_execute = True if execute_on_ready is None else execute_on_ready

    if content_type.startswith("application/json"):
        try:
            body = await request.json()
            target_user_id = body.get("user_id", "farmer_1")
            target_session_id = body.get("session_id", "session_1")
            target_msg = body.get("message", "")
            target_lang = body.get("preferred_language") or body.get("lang") or "auto"
            target_params = body.get("current_params") or {}
            target_execute = body.get("execute_on_ready", True)
            img_url = body.get("image_url") or body.get("image")
            if img_url and os.path.exists(img_url):
                try:
                    with open(img_url, "rb") as f:
                        target_image_bytes = f.read()
                except Exception:
                    pass
        except Exception:
            pass
    else:
        if current_params and str(current_params).strip():
            try:
                target_params = json.loads(current_params)
            except Exception:
                target_params = {}
        
        if image and image.filename:
            target_image_bytes = await image.read()
        elif image_url and os.path.exists(image_url):
            try:
                with open(image_url, "rb") as f:
                    target_image_bytes = f.read()
            except Exception:
                pass

        if audio and audio.filename:
            target_audio_bytes = await audio.read()
        elif audio_url and os.path.exists(audio_url):
            try:
                with open(audio_url, "rb") as f:
                    target_audio_bytes = f.read()
            except Exception:
                pass

    try:
        result = await process_conversational_intake(
            user_id=target_user_id or "farmer_1",
            session_id=target_session_id or "session_1",
            message=target_msg,
            current_params=target_params,
            image_source=target_image_bytes,
            audio_source=target_audio_bytes,
            preferred_language=target_lang,
            execute_on_ready=target_execute
        )
        return {
            "success": True,
            "user_id": target_user_id,
            "session_id": target_session_id,
            "reply": result.get("reply"),
            "intent": result.get("intent"),
            "detected_language": result.get("detected_language"),
            "extracted_params": result.get("extracted_params"),
            "missing_fields": result.get("missing_fields"),
            "genui_widgets": result.get("genui_widgets"),
            "is_ready": result.get("is_ready"),
            "dispatch_outcome": result.get("dispatch_outcome")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/intake/validate-multimodal")
async def validate_multimodal(
    crop: Optional[str] = Form(None),
    lang: Optional[str] = Form("en"),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None)
):
    from tools.multimodal_grading import grade_and_validate_harvest_image, validate_and_transcribe_voice_note
    result = {}
    
    if image:
        image_bytes = await image.read()
        res = grade_and_validate_harvest_image(image_bytes, crop_hint=crop)
        result["image_validation"] = res
        
    if audio:
        audio_bytes = await audio.read()
        res = validate_and_transcribe_voice_note(audio_bytes, lang=lang)
        result["audio_validation"] = res
        
    return result




@app.post("/api/v1/dispatch")
async def trigger_harvest_dispatch(
    farmer_id: Optional[str] = Form(None),
    crop: Optional[str] = Form(None),
    volume_kg: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    lang: Optional[str] = Form("en"),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None)
):
    session_id = uuid.uuid4().hex[:8]
    image_path = None
    audio_path = None

    # Clean empty inputs from Swagger UI
    clean_farmer_id = _clean_str(farmer_id)
    clean_crop = _clean_str(crop)
    clean_location = _clean_str(location)
    clean_notes = _clean_str(notes)
    clean_lang = _clean_str(lang) or "en"
    
    clean_volume = None
    if volume_kg and str(volume_kg).strip():
        try:
            clean_volume = float(str(volume_kg).strip())
        except ValueError:
            clean_volume = None

    try:
        # Save temporary uploaded image
        if image and image.filename:
            image_ext = os.path.splitext(image.filename)[1] or ".jpg"
            image_path = os.path.join(UPLOAD_DIR, f"{session_id}_image{image_ext}")
            with open(image_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)

        # Save temporary uploaded audio
        if audio and audio.filename:
            audio_ext = os.path.splitext(audio.filename)[1] or ".mp4"
            audio_path = os.path.join(UPLOAD_DIR, f"{session_id}_audio{audio_ext}")
            with open(audio_path, "wb") as buffer:
                shutil.copyfileobj(audio.file, buffer)

        # Execute the multimodal agentic pipeline
        report = process_multimodal_harvest_request(
            farmer_id=clean_farmer_id,
            crop=clean_crop,
            volume_kg=clean_volume,
            location=clean_location,
            image_source=image_path,
            audio_source=audio_path,
            notes=clean_notes,
            preferred_language=clean_lang
        )

        tx_id = f"tx_{uuid.uuid4().hex[:12]}"
        effective_farmer = clean_farmer_id or f"KM-FARMER-{tx_id[3:9].upper()}"

        return {
            "success": True,
            "transaction_id": tx_id,
            "farmer_id": effective_farmer,
            "language": clean_lang,
            "executive_report": report
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Cleanup temporary files
        if image_path and os.path.exists(image_path):
            try: os.remove(image_path)
            except Exception: pass
        if audio_path and os.path.exists(audio_path):
            try: os.remove(audio_path)
            except Exception: pass


class FarmerProfileRequest(BaseModel):
    email: str
    name: Optional[str] = None


class LinkDispatchRequest(BaseModel):
    email: str
    transaction_id: str
    farmer_id: Optional[str] = None
    summary: Optional[Dict[str, Any]] = None


@app.post("/api/v1/farmer/profile")
def get_or_create_farmer_profile_endpoint(req: FarmerProfileRequest):
    """
    Retrieves or creates a farmer profile in Cloud Firestore identified by email,
    returning the unique collision-safe Farmer ID and complete historical ledger.
    """
    try:
        state_mgr = KilimoStateManager()
        profile = state_mgr.get_or_create_farmer(email=req.email, name=req.name)
        history = state_mgr.get_farmer_history(farmer_id=profile["farmer_id"], email=profile["email"])
        return {
            "status": "SUCCESS",
            "farmer_id": profile["farmer_id"],
            "email": profile["email"],
            "name": profile["name"],
            "is_new": profile.get("is_new", False),
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/v1/farmer/history")
def get_farmer_history_endpoint(email: Optional[str] = None, farmer_id: Optional[str] = None):
    """
    Returns the persistent dispatch waybill history from Cloud Firestore for the given farmer.
    """
    try:
        state_mgr = KilimoStateManager()
        history = state_mgr.get_farmer_history(farmer_id=farmer_id, email=email)
        return {
            "status": "SUCCESS",
            "farmer_id": farmer_id,
            "email": email,
            "count": len(history),
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/farmer/link-dispatch")
def link_dispatch_to_farmer_endpoint(req: LinkDispatchRequest):
    """
    Associates a newly completed agricultural dispatch report to a farmer's Firestore account.
    """
    try:
        state_mgr = KilimoStateManager()
        result = state_mgr.link_transaction_to_farmer(
            email=req.email,
            transaction_id=req.transaction_id,
            farmer_id=req.farmer_id,
            summary=req.summary
        )
        history = state_mgr.get_farmer_history(farmer_id=result["farmer_id"], email=result["farmer_email"])
        return {
            **result,
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))