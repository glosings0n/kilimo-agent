import os
import mimetypes
from typing import Optional, List, Union
from dotenv import load_dotenv
from google import genai
from google.genai import types

from tools.market_and_logistics import fetch_market_rates, dispatch_freight_booking
from state.firestore_manager import KilimoStateManager

load_dotenv()

# Standard Model & Platform configuration for Gemini Enterprise Agent Platform
from config.models import API_AUDIO_MODEL as MODEL_NAME
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "kilimoagent")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "global")

# Initialize Client with Enterprise Agent Platform routing enabled
client = genai.Client(
    enterprise=True,
    project=PROJECT_ID,
    location=LOCATION
)

SYSTEM_INSTRUCTION = """
You are KilimoAgent, an autonomous enterprise agent orchestrating agricultural commodity arbitrage, crop quality inspection, and logistics fulfillment.

CRITICAL PROTOCOL:
1. AUDIO TRANSCRIPTION PROTOCOL:
   - If an AUDIO recording IS attached, listen carefully and transcribe verbatim. Extract exact numeric weight (KG) and origin depot mentioned.
   - If NO AUDIO IS attached and no volume/location is provided in text, DO NOT invent or fabricate an audio transcription. Flag missing volume or ask for clarification, or use default standard lot size (1,000 kg) explicitly marked as [ESTIMATED_DEFAULT].
2. IMAGE INSPECTION:
   - Visually inspect crop quality, species, moisture level, and grade (Grade A / B).
3. MARKET ARBITRAGE & DISPATCH:
   - Call `fetch_market_rates` using verified volume and location.
   - Call `dispatch_freight_booking` autonomously.
4. EXECUTIVE OUTPUT:
   - Present the structured ledger. If audio was present, cite the exact quote. If not, state "Audio: Not Provided".
"""

def _build_multimodal_part(file_source: Union[str, bytes], mime_type: Optional[str] = None) -> types.Part:
    """
    Constructs a Google GenAI Part object from local path, Cloud Storage URI, or raw bytes.
    """
    if isinstance(file_source, str):
        # Cloud Storage URI (e.g. gs://bucket-name/crops/harvest.jpg)
        if file_source.startswith("gs://") or file_source.startswith("https://"):
            guessed_type = mime_type or mimetypes.guess_type(file_source)[0] or "application/octet-stream"
            return types.Part.from_uri(file_uri=file_source, mime_type=guessed_type)
        
        # Local file path
        if os.path.exists(file_source):
            guessed_type = mime_type or mimetypes.guess_type(file_source)[0] or "application/octet-stream"
            with open(file_source, "rb") as f:
                data_bytes = f.read()
            return types.Part.from_bytes(data=data_bytes, mime_type=guessed_type)
        
        raise FileNotFoundError(f"File not found: {file_source}")

    elif isinstance(file_source, bytes):
        if not mime_type:
            raise ValueError("mime_type must be specified when providing raw bytes.")
        return types.Part.from_bytes(data=file_source, mime_type=mime_type)
    
    raise TypeError("file_source must be a file path, gs:// URI, or bytes.")


def process_multimodal_harvest_request(
    farmer_id: str,
    crop: Optional[str] = None,
    volume_kg: Optional[float] = None,
    location: Optional[str] = None,
    image_path: Optional[str] = None,
    audio_path: Optional[str] = None,
    notes: Optional[str] = None
) -> str:
    """
    Executes the end-to-end multimodal agentic workflow and updates Firestore checkpoints.
    """
    state_manager = KilimoStateManager(project_id=PROJECT_ID)
    
    initial_payload = {
        "farmer_id": farmer_id,
        "crop": crop,
        "volume_kg": volume_kg,
        "location": location,
        "has_image": bool(image_path),
        "has_audio": bool(audio_path),
        "notes": notes
    }
    
    # 1. State Checkpoint: Initialized
    tx_id = state_manager.initialize_transaction(
        farmer_id=farmer_id,
        initial_payload=initial_payload
    )
    print(f"[STATE] Transaction initialized: {tx_id}")
    
    # 2. State Checkpoint: Running Agentic Pipeline
    state_manager.update_stage(tx_id, "RUNNING_MULTIMODAL_AGENTIC_PIPELINE", {
        "model": MODEL_NAME,
        "location": LOCATION,
        "multimodal_inputs": {
            "image": image_path,
            "audio": audio_path
        }
    })
    
    # Construct Content Parts
    content_parts: List[Union[str, types.Part]] = []
    
    # Add textual prompt context
    text_prompt = (
        f"Farmer ID: {farmer_id}\n"
        f"Declared Crop: {crop or 'Inspect attached media to identify'}\n"
        f"Declared Volume: {f'{volume_kg} KG' if volume_kg else 'Extract from voice note or estimate from visual inspection'}\n"
        f"Pickup Location: {location or 'Extract from voice note'}\n"
        f"Additional Notes: {notes or 'None'}\n\n"
        f"Task: Execute crop inspection, real-time market arbitrage, and autonomous logistics dispatch now."
    )
    content_parts.append(text_prompt)
    
    # Attach Image Part if present
    if image_path:
        print(f"[INGEST] Attaching crop inspection image: {image_path}")
        image_part = _build_multimodal_part(image_path)
        content_parts.append(image_part)
        
    # Attach Audio Part if present
    if audio_path:
        print(f"[INGEST] Attaching farmer voice note: {audio_path}")
        audio_part = _build_multimodal_part(audio_path)
        content_parts.append(audio_part)
    
    # Create enterprise chat session with Automatic Function Calling (AFC)
    chat = client.chats.create(
        model=MODEL_NAME,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[fetch_market_rates, dispatch_freight_booking],
            temperature=0.2
        )
    )
    
    response = chat.send_message(content_parts)
    
    # 3. State Checkpoint: Completed
    state_manager.complete_transaction(tx_id, {
        "agent_raw_output": response.text
    })
    print(f"[STATE] Transaction {tx_id} marked COMPLETED in Firestore.")
    
    return response.text

if __name__ == "__main__":
    print(f"=== Running KilimoAgent 100% Blind Multimodal Test ===")
    
    audio_path = "assets/audios/sample_voice.mp4"
    
    sample_output = process_multimodal_harvest_request(
        farmer_id="FARMER-TEST-BLIND",
        crop=None,
        volume_kg=None,
        location=None,
        audio_path=audio_path if os.path.exists(audio_path) else None,
        notes=None
    )
    
    print("\n=== Agent Final Outcome ===")
    print(sample_output)