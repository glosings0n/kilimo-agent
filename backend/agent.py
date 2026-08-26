import os
import mimetypes
from typing import Optional, List, Union
from dotenv import load_dotenv
from google import genai
from google.genai import types

from tools.market_and_logistics import fetch_market_rates, dispatch_freight_booking
from state.firestore_manager import KilimoStateManager
from guardrails.gemma_guard import GemmaModelArmor

load_dotenv()

MODEL_NAME = "gemini-3.6-flash"
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "kilimoagent")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "global")

client = genai.Client(
    enterprise=True,
    project=PROJECT_ID,
    location=LOCATION
)

SYSTEM_INSTRUCTION = """
You are KilimoAgent, an autonomous enterprise agent orchestrating agricultural commodity arbitrage, crop quality inspection, and logistics fulfillment.

CRITICAL EXECUTION RULES (STRICT ACCURACY & ANTI-HALLUCINATION):
1. AUDIO TRANSCRIPTION:
   - If an AUDIO recording IS provided: Listen and transcribe the farmer's speech. Extract the exact weight in kilograms and origin depot. Cite the exact spoken phrase in your ledger.
   - If NO AUDIO IS provided: State clearly "Audio: None Provided". DO NOT invent a transcription or quote. If no volume is declared in text either, use a default batch of 1,000.0 KG clearly labeled "[DEFAULT LOT]".
2. VISUAL INSPECTION:
   - If an IMAGE is provided: Inspect crop species, grain condition, drying level, and assign Quality Grade (Grade A / B).
   - If NO IMAGE is provided: State "Visual: Not Provided".
3. REAL-TIME MARKET ARBITRAGE:
   - Call `fetch_market_rates` with the verified volume and origin depot.
   - Select the hub maximizing net return: Net Revenue = (Volume * Price) - Freight.
4. AUTONOMOUS FREIGHT DISPATCH:
   - Call `dispatch_freight_booking` to lock capacity.
5. LEDGER:
   - Output the structured breakdown with exact data sources.
"""

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
            
            # Normalisation stricte pour les fichiers audios/vidéos
            ext = os.path.splitext(resolved)[1].lower()
            if ext in [".mp4", ".m4a", ".aac"]:
                # Forcer en audio si le fichier sert de note vocale
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


def process_multimodal_harvest_request(
    farmer_id: Optional[str] = None,
    crop: Optional[str] = None,
    volume_kg: Optional[float] = None,
    location: Optional[str] = None,
    image_source: Optional[Union[str, bytes]] = None,
    audio_source: Optional[Union[str, bytes]] = None,
    notes: Optional[str] = None
) -> str:
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
            "notes": notes
        }
    )
    print(f"\n[STATE] Transaction: {tx_id} | Farmer ID: {effective_farmer_id}")

    # Guardrail audit via Gemma
    print("[GUARDRAIL] Invoking Gemma Model Armor for security audit...")
    raw_text = f"Farmer: {effective_farmer_id}, Crop: {crop or 'Auto'}, Volume: {volume_kg or 'Auto'}, Location: {location or 'Auto'}"
    is_safe, sanitized_notes, guard_meta = gemma_armor.inspect_and_sanitize(raw_text, notes or "")

    state_manager.update_stage(tx_id, "GUARDRAIL_AUDITED", {
        "guard_model": "gemma-2-9b-it",
        "verdict": guard_meta.get("security_verdict", "SAFE"),
        "is_safe": is_safe
    })

    if not is_safe:
        return f"[SECURITY REJECTION] Flagged by Guardrail: {guard_meta}"

    state_manager.update_stage(tx_id, "RUNNING_AGENTIC_PIPELINE", {"model": MODEL_NAME})

    content_parts: List[Union[str, types.Part]] = []
    
    prompt = f"Farmer ID: {effective_farmer_id}\n"
    if crop: prompt += f"Declared Crop: {crop}\n"
    if volume_kg: prompt += f"Declared Volume: {volume_kg} KG\n"
    if location: prompt += f"Declared Pickup Location: {location}\n"
    if sanitized_notes: prompt += f"Notes: {sanitized_notes}\n"
    prompt += "\nTask: Execute field data extraction, verify crop quality, perform market arbitrage, and lock in logistics booking."
    content_parts.append(prompt)

    if image_source:
        print(f"[INGEST] Attaching image asset...")
        content_parts.append(_build_multimodal_part(image_source))

    if audio_source:
        print(f"[INGEST] Attaching audio voice note...")
        content_parts.append(_build_multimodal_part(audio_source))

    chat = client.chats.create(
        model=MODEL_NAME,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[fetch_market_rates, dispatch_freight_booking],
            temperature=0.0
        )
    )

    response = chat.send_message(content_parts)

    state_manager.complete_transaction(tx_id, {
        "agent_raw_output": response.text,
        "guardrail_metadata": guard_meta
    })
    print(f"[STATE] Transaction {tx_id} marked COMPLETED in Firestore.\n")

    return response.text


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