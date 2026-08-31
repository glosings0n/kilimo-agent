import os
import mimetypes
import asyncio
from typing import Optional, List, Union, Dict, Any
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService

from google.adk.tools import google_search

from tools.market_and_logistics import (
    calculate_route_and_freight,
    fetch_realtime_market_arbitrage,
    analyze_corridor_market_opportunities,
    get_regional_export_compliance,
    generate_carrier_waybill,
    fetch_market_rates,
    dispatch_freight_booking
)
from schemas.dispatch_schema import ExecutiveDispatchResponse
from state.firestore_manager import KilimoStateManager
from guardrails.gemma_guard import GemmaModelArmor
from receptionist_agent import run_receptionist_triage, kilimo_receptionist_agent

from config.models import API_GEMINI_MODEL as MODEL_NAME

load_dotenv()

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "kilimoagent")
LOCATION = os.getenv("GEMINI_LOCATION", os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"))

try:
    client = genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location=LOCATION
    )
except Exception:
    client = genai.Client()

SYSTEM_INSTRUCTION = """
You are KilimoAgent, an autonomous enterprise agent orchestrating agricultural commodity arbitrage, crop quality inspection, corridor optimization, export compliance verification, and logistics fulfillment across East and Central Africa (DRC, Kenya, Uganda, Rwanda, Tanzania).

CRITICAL OPERATIONAL RULES (STRICT ACCURACY & ANTI-HALLUCINATION):
1. MULTILINGUAL SUPPORT (Swahili, French, English):
   - You accept and understand audio/text in Swahili (Kiswahili), French (Français), and English.
   - Maintain the farmer's language in the response summary while adhering to standard schema formats.
2. AUDIO TRANSCRIPTION PROTOCOL:
   - If an AUDIO recording is provided: Listen carefully and transcribe the farmer's speech verbatim. Extract exact numeric weight (KG) and origin depot mentioned (e.g. Bunia, Goma, Bukavu, Kitale, Eldoret, Nakuru, Busia, Kampala, Kigali, Dar es Salaam, Mwanza, Butembo).
   - If NO AUDIO is provided: Set is_audio_present=False and state "Audio: None Provided". If no volume is declared in text either, estimate standard lot size (1,000.0 KG) explicitly labeled "[DEFAULT LOT]".
3. COMPUTER VISION QUALITY INSPECTION:
   - If an IMAGE is provided: Inspect crop species, grain condition, drying level (moisture estimation), pest infestation, and assign Quality Grade ('GRADE_A', 'GRADE_B', or 'REJECTED').
   - If NO IMAGE is provided: Set visual specimen to "Visual: Not Provided".
4. REAL-TIME MARKET ARBITRAGE & ROUTING TOOLS:
   - Call `fetch_realtime_market_arbitrage` with the verified crop, origin depot, volume (KG), and quality grade.
   - Call `calculate_route_and_freight` to get real haversine road distance, GPS coordinates, waypoint nodes, transit hours, and freight cost.
   - Select the optimal market hub that maximizes net farmer payout (Gross - Freight).
5. STRATEGIC CORRIDOR OPPORTUNITIES & OFF-RAMP ANALYSIS:
   - Call `analyze_corridor_market_opportunities` to evaluate intermediate wholesale buyers, millers, and deficit silos along the transport corridor (e.g. Nakuru Grain Millers, Eldoret NCPB Silos, Busia Border Market, Butembo Trading Center, Mwanza Port).
   - Formulate clear corridor recommendations comparing freight savings and net margin differentials against the primary destination.
6. REGIONAL EXPORT COMPLIANCE & SPS PROTOCOLS:
   - Call `get_regional_export_compliance` whenever cross-border or regional trade is involved.
   - Verify East African Community (EAC) & COMESA quality standards: Moisture ceiling (13.5% for maize/beans, 12% for coffee/rice/cassava, 13% for sorghum/soya), Total Aflatoxin limit (max 10 ppb total, 5 ppb B1), and phytosanitary clearance certificates from national plant health authorities (KEPHIS, ONAPAC/OCC, MAAIF, RICA, TPHA/TBS).
   - Confirm 0% tariff status under the EAC Common Market Protocol and COMESA Simplified Trade Regime (STR).
7. AUTONOMOUS FREIGHT DISPATCH & DIGITAL WAYBILL:
   - Call `generate_carrier_waybill` to lock logistics capacity and obtain a cryptographic SHA-256 waybill tracking seal with waypoint routing.
8. REAL-TIME WEB GROUNDING:
   - Use `google_search` when live regional trade alerts, border post updates, or weather conditions along the corridor need verification.
9. EXECUTIVE REPORTING:
   - Provide precise numerical calculations with zero approximations.
"""

# Active tools for Google ADK Agent
active_adk_tools = [
    google_search,
    fetch_realtime_market_arbitrage,
    calculate_route_and_freight,
    analyze_corridor_market_opportunities,
    get_regional_export_compliance,
    generate_carrier_waybill,
    fetch_market_rates,
    dispatch_freight_booking
]

# Instantiate Google ADK Agent
kilimo_adk_agent = Agent(
    name="kilimo_dispatch_agent",
    model=MODEL_NAME,
    description="KilimoAgent Autonomous Agricultural Arbitrage and Carrier Dispatch Agent for East and Central Africa.",
    instruction=SYSTEM_INSTRUCTION,
    tools=active_adk_tools
)

adk_session_service = InMemorySessionService()
adk_runner = Runner(
    agent=kilimo_adk_agent,
    session_service=adk_session_service,
    app_name="kilimo_agent"
)

def _resolve_path(path_str: str) -> Optional[str]:
    """Resolves relative or absolute paths gracefully."""
    if not path_str:
        return None
    clean = path_str.strip().strip("'").strip('"')
    if os.path.exists(clean):
        return clean
    if clean.startswith("backend/") and os.path.exists(clean.replace("backend/", "", 1)):
        return clean.replace("backend/", "", 1)
    if os.path.exists(os.path.join(os.getcwd(), clean)):
        return os.path.join(os.getcwd(), clean)
    return None

def _build_multimodal_part(file_source: Union[str, bytes], mime_type: Optional[str] = None) -> types.Part:
    if isinstance(file_source, str):
        if file_source.startswith("gs://") or file_source.startswith("https://"):
            guessed_type = mime_type or mimetypes.guess_type(file_source)[0] or "application/octet-stream"
            return types.Part.from_uri(file_uri=file_source, mime_type=guessed_type)

        resolved = _resolve_path(file_source)
        if resolved and os.path.exists(resolved):
            guessed_type = mime_type or mimetypes.guess_type(resolved)[0] or "application/octet-stream"
            
            ext = os.path.splitext(resolved)[1].lower()
            if ext in [".mp4", ".m4a", ".aac"]:
                guessed_type = "audio/mp4"
            elif ext in [".mp3"]:
                guessed_type = "audio/mp3"
            elif ext in [".wav"]:
                guessed_type = "audio/wav"
            elif ext in [".jpg", ".jpeg"]:
                guessed_type = "image/jpeg"
            elif ext in [".png"]:
                guessed_type = "image/png"
                
            with open(resolved, "rb") as f:
                data_bytes = f.read()
            return types.Part.from_bytes(data=data_bytes, mime_type=guessed_type)

        raise FileNotFoundError(f"File not found: {file_source}")

    elif isinstance(file_source, bytes):
        return types.Part.from_bytes(data=file_source, mime_type=mime_type or "application/octet-stream")

    raise TypeError("file_source must be a file path, gs:// URI, or bytes.")


async def _run_adk_pipeline(farmer_id: str, content_parts: List[Union[str, types.Part]]) -> str:
    """Executes the agentic pipeline using Google ADK Runner & Sessions."""
    session = await adk_session_service.create_session(app_name="kilimo_agent", user_id=farmer_id)
    
    # Format parts for ADK
    parts = []
    for item in content_parts:
        if isinstance(item, str):
            parts.append(types.Part.from_text(text=item))
        elif isinstance(item, types.Part):
            parts.append(item)

    user_content = types.Content(role="user", parts=parts)
    
    full_output = ""
    async for event in adk_runner.run_async(
        user_id=farmer_id,
        session_id=session.id,
        new_message=user_content
    ):
        if event.content and event.content.parts:
            for p in event.content.parts:
                if p.text:
                    full_output += p.text
    return full_output


def process_multimodal_harvest_request(
    farmer_id: Optional[str] = None,
    crop: Optional[str] = None,
    volume_kg: Optional[float] = None,
    location: Optional[str] = None,
    image_source: Optional[Union[str, bytes]] = None,
    audio_source: Optional[Union[str, bytes]] = None,
    notes: Optional[str] = None,
    preferred_language: str = "en"
) -> Union[str, Dict[str, Any]]:
    state_manager = KilimoStateManager(project_id=PROJECT_ID)
    gemma_armor = GemmaModelArmor()

    tx_id, effective_farmer_id = state_manager.initialize_transaction(
        farmer_id=farmer_id,
        initial_payload={
            "crop": crop,
            "volume_kg": volume_kg,
            "location": location,
            "has_image": bool(image_source),
            "has_audio": bool(audio_source),
            "notes": notes,
            "language": preferred_language
        }
    )
    print(f"\n[STATE] Transaction: {tx_id} | Farmer ID: {effective_farmer_id}")

    # Guardrail audit via Gemma
    print("[GUARDRAIL] Invoking Gemma Model Armor for security audit...")
    raw_text = f"Farmer: {effective_farmer_id}, Crop: {crop or 'Auto'}, Volume: {volume_kg or 'Auto'}, Location: {location or 'Auto'}"
    is_safe, sanitized_notes, guard_meta = gemma_armor.inspect_and_sanitize(
        raw_input=raw_text,
        notes=notes or "",
        crop=crop,
        volume_kg=volume_kg,
        location=location
    )

    state_manager.update_stage(tx_id, "GUARDRAIL_AUDITED", {
        "guard_model": "gemma-2-9b-it",
        "verdict": guard_meta.get("security_verdict", "SAFE"),
        "is_safe": is_safe
    })

    if not is_safe:
        rejection_msg = f"[SECURITY REJECTION] Flagged by Guardrail: {guard_meta.get('notice', 'Security violation')}"
        state_manager.complete_transaction(tx_id, {"error": rejection_msg, "guardrail": guard_meta})
        return rejection_msg

    state_manager.update_stage(tx_id, "RUNNING_AGENTIC_PIPELINE", {"adk_agent": kilimo_adk_agent.name, "model": MODEL_NAME})

    content_parts: List[Union[str, types.Part]] = []
    
    prompt = f"Farmer ID: {effective_farmer_id}\n"
    prompt += f"Preferred Language: {preferred_language}\n"
    if crop: prompt += f"Declared Crop: {crop}\n"
    if volume_kg: prompt += f"Declared Volume: {volume_kg} KG\n"
    if location: prompt += f"Declared Pickup Location: {location}\n"
    if sanitized_notes: prompt += f"Notes: {sanitized_notes}\n"
    prompt += "\nTask: Execute field data extraction, verify crop quality, perform real-time market arbitrage using real distance and spot price tools, and lock in logistics booking with cryptographic waybill."
    content_parts.append(prompt)

    if image_source:
        print(f"[INGEST] Attaching image asset...")
        content_parts.append(_build_multimodal_part(image_source))

    if audio_source:
        print(f"[INGEST] Attaching audio voice note...")
        content_parts.append(_build_multimodal_part(audio_source))

    # Execute Google ADK Agent Pipeline
    print(f"[ADK] Executing pipeline via Google ADK Agent '{kilimo_adk_agent.name}' (Model: {MODEL_NAME})...")
    raw_output = None
    try:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import nest_asyncio
            nest_asyncio.apply()
            raw_output = loop.run_until_complete(_run_adk_pipeline(effective_farmer_id, content_parts))
        else:
            raw_output = asyncio.run(_run_adk_pipeline(effective_farmer_id, content_parts))
    except Exception as adk_exc:
        print(f"[ADK RUNTIME NOTICE] {adk_exc}. Falling back to direct client execution...")
        callable_tools = [t for t in active_adk_tools if callable(t)]
        try:
            chat = client.chats.create(
                model=MODEL_NAME,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    tools=callable_tools,
                    temperature=0.1
                )
            )
            response = chat.send_message(content_parts)
            raw_output = response.text
        except Exception as direct_exc:
            print(f"[FALLBACK NOTICE] Direct client execution note: {direct_exc}. Executing deterministic tool workflow...")
            loc = location or "Kitale"
            crp = crop or "maize"
            vol = volume_kg or 1000.0
            arb = fetch_realtime_market_arbitrage(crp, loc, vol)
            rec_hub = arb.get("recommended_market", "Nairobi")
            wb = generate_carrier_waybill(loc, rec_hub, vol)
            corridor = analyze_corridor_market_opportunities(crp, loc, rec_hub, vol)
            compliance = get_regional_export_compliance(crp, arb.get("origin_country", "Kenya"))
            
            raw_output = (
                f"Origin Depot: {loc}\n"
                f"Selected Destination: {rec_hub}\n"
                f"Net Profit: ${arb.get('projected_net_return_usd', 0.0):,.2f} USD\n"
                f"Freight Cost: ${wb.get('freight_cost_usd', 0.0):,.2f} USD\n"
                f"Carrier Waybill: {wb.get('waybill_id')}\n"
                f"Audit Seal: {wb.get('verification_stamp')}\n"
                f"Corridor Recommendation: {corridor.get('top_corridor_recommendation', 'Direct Delivery')} ({corridor.get('top_badge', 'PRIMARY')})\n"
                f"Export Standard: {compliance.get('harmonized_standard')}\n"
            )

    state_manager.complete_transaction(tx_id, {
        "agent_raw_output": raw_output,
        "guardrail_metadata": guard_meta
    })
    print(f"[STATE] Transaction {tx_id} marked COMPLETED in Firestore.\n")

    return raw_output


async def process_conversational_intake(
    user_id: str,
    session_id: str,
    message: str,
    current_params: Optional[Dict[str, Any]] = None,
    image_source: Optional[Union[str, bytes]] = None,
    audio_source: Optional[Union[str, bytes]] = None,
    notes: Optional[str] = None,
    preferred_language: str = "auto",
    execute_on_ready: bool = True
) -> Dict[str, Any]:
    """
    Coordinates conversational triage via the Receptionist Agent.
    Progressively collects crop, volume_kg, origin_depot, destination_preference.
    When is_ready is True (or execute_on_ready=True with complete fields),
    automatically invokes the 8-tool kilimo_dispatch_agent pipeline.
    """
    # Convert image_source and audio_source to bytes if file paths
    img_b = None
    if isinstance(image_source, bytes):
        img_b = image_source
    elif isinstance(image_source, str) and os.path.exists(image_source):
        try:
            with open(image_source, "rb") as f:
                img_b = f.read()
        except Exception:
            pass

    aud_b = None
    if isinstance(audio_source, bytes):
        aud_b = audio_source
    elif isinstance(audio_source, str) and os.path.exists(audio_source):
        try:
            with open(audio_source, "rb") as f:
                aud_b = f.read()
        except Exception:
            pass

    # 1. Run Receptionist Triage
    triage_result = await run_receptionist_triage(
        user_id=user_id,
        session_id=session_id,
        message=message,
        context_state=current_params,
        lang=preferred_language,
        image_bytes=img_b,
        audio_bytes=aud_b
    )

    extracted = triage_result.get("extracted_params", {})
    is_ready = bool(triage_result.get("is_ready", False))
    dispatch_outcome = None

    # 2. If ready and execution requested, trigger the full autonomous dispatch pipeline
    if is_ready and execute_on_ready:
        crop = extracted.get("crop")
        volume_kg = extracted.get("volume_kg")
        origin_depot = extracted.get("origin_depot")
        
        # Execute the multimodal agentic pipeline
        dispatch_report = process_multimodal_harvest_request(
            farmer_id=user_id,
            crop=crop,
            volume_kg=volume_kg,
            location=origin_depot,
            image_source=image_source,
            audio_source=audio_source,
            notes=notes or message,
            preferred_language=preferred_language
        )
        dispatch_outcome = {
            "dispatched": True,
            "executive_report": dispatch_report
        }

    return {
        "reply": triage_result.get("reply", ""),
        "intent": triage_result.get("intent", ""),
        "action": triage_result.get("action", "NORMAL"),
        "is_terminated": triage_result.get("is_terminated", False),
        "detected_language": triage_result.get("detected_language", "en"),
        "extracted_params": extracted,
        "missing_fields": triage_result.get("missing_fields", []),
        "genui_widgets": triage_result.get("genui_widgets", []),
        "is_ready": is_ready,
        "dispatch_outcome": dispatch_outcome
    }


if __name__ == "__main__":
    print("=" * 65)
    print(f"🌾 KILIMOAGENT TERMINAL INTERFACE ({MODEL_NAME})")
    print("=" * 65)
    
    f_id = input("Farmer ID [Press Enter to auto-generate]: ").strip() or None

    img_in = input("Enter Path to Harvest Image (or Enter to skip): ").strip()
    resolved_img = _resolve_path(img_in)
    if resolved_img:
        print(f"  --> Loaded Image: {resolved_img}")
    elif img_in:
        print(f"  [!] File not found: {img_in}")

    aud_in = input("Enter Path to Voice Note (or Enter to skip): ").strip()
    resolved_aud = _resolve_path(aud_in)
    if resolved_aud:
        print(f"  --> Loaded Audio: {resolved_aud}")
    elif aud_in:
        print(f"  [!] File not found: {aud_in}")

    crop_in = input("Declared Crop (Enter for auto-detect): ").strip() or None
    vol_raw = input("Declared Volume KG (Enter for auto-detect): ").strip()
    vol_in = float(vol_raw) if vol_raw else None
    loc_in = input("Pickup Location (Enter for auto-detect): ").strip() or None
    notes_in = input("Field Notes (Optional): ").strip() or None

    print("\n[INFO] Triggering Autonomous Pipeline...")
    output = process_multimodal_harvest_request(
        farmer_id=f_id,
        crop=crop_in,
        volume_kg=vol_in,
        location=loc_in,
        image_source=resolved_img,
        audio_source=resolved_aud,
        notes=notes_in
    )

    print("=" * 65)
    print("📋 AGENT FINAL EXECUTIVE OUTCOME")
    print("=" * 65)
    print(output)