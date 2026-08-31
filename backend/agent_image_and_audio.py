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
from config.models import API_VISION_MODEL as MODEL_NAME
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

CRITICAL PROTOCOL (ANTI-HALLUCINATION & STRICT EXTRACTION):
1. AUDIO AS GROUND TRUTH (Highest Authority for Numbers & Names):
   - If an AUDIO recording is provided, listen to the speaker (supports Swahili, French, English, Lingala).
   - EXACT WEIGHT: Extract ONLY the precise numeric volume explicitly stated by the farmer (e.g., "kilo elfu moja na mia tano" -> exactly 1500.0 KG). NEVER extrapolate, round, or invent weights.
   - EXACT LOCATION: Extract ONLY the actual geographic hub/depot named in the voice note (e.g., "Bunia depot" -> Bunia).
   - Show the verbatim transcribed quote in the ledger.
2. IMAGE INSPECTION (Visual Confirmation Only):
   - Visually inspect the attached image strictly to determine: Crop species (e.g. Maize / Cassava), grain integrity, drying level, and quality grade (Grade A or B).
   - DO NOT estimate total batch weight from photos; batch weight comes solely from the farmer's voice declaration.
3. REAL-TIME MARKET ARBITRAGE:
   - Call `fetch_market_rates` using the exact volume and origin depot extracted from the audio.
   - Calculate Net Revenue = (Volume * Spot Market Price) - Estimated Freight Cost.
4. AUTONOMOUS LOGISTICS DISPATCH:
   - Identify the terminal providing the maximum net profit.
   - Call `dispatch_freight_booking` with the exact extracted payload.
5. EXECUTIVE LEDGER OUTPUT:
   - Output a transparent execution ledger listing: Transcribed voice excerpt, visual quality grade, market comparison matrix, logistics waybill ID, and final net payout in USD.
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
    Executes the end-to-end multimodal agentic workflow without bias or speculative hints.
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
    
    # Formulate neutral, unbiased execution prompt
    prompt_lines = [f"Farmer Identification: {farmer_id}"]
    
    if crop:
        prompt_lines.append(f"Explicit Crop Declaration: {crop}")
    else:
        prompt_lines.append("Crop Type: Identify purely via attached image and voice note.")
        
    if volume_kg:
        prompt_lines.append(f"Explicit Volume Declaration: {volume_kg} KG")
    else:
        prompt_lines.append("Volume: Extract exact kilograms spoken in the audio recording.")
        
    if location:
        prompt_lines.append(f"Explicit Origin Location: {location}")
    else:
        prompt_lines.append("Origin Location: Extract exact depot/town spoken in the audio recording.")
        
    if notes:
        prompt_lines.append(f"Farmer Field Notes: {notes}")
        
    prompt_lines.append("\nTask: Execute field data extraction, verify crop quality, perform market arbitrage, and lock in logistics booking.")
    
    text_prompt = "\n".join(prompt_lines)
    content_parts.append(text_prompt)
    
    # Attach Image Part if present
    if image_path:
        print(f"[INGEST] Loading crop visual inspection asset: {image_path}")
        image_part = _build_multimodal_part(image_path)
        content_parts.append(image_part)
        
    # Attach Audio Part if present
    if audio_path:
        print(f"[INGEST] Loading farmer voice note recording: {audio_path}")
        audio_part = _build_multimodal_part(audio_path)
        content_parts.append(audio_part)
    
    # Create enterprise chat session with Automatic Function Calling (AFC)
    chat = client.chats.create(
        model=MODEL_NAME,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[fetch_market_rates, dispatch_freight_booking],
            temperature=0.0  # Zero temperature for deterministic, hallucination-free extraction
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
    print(f"=== Running KilimoAgent Unbiased Multimodal Workflow ({MODEL_NAME}) ===")
    
    # Paths to local media
    image_file = "assets/images/sample_maize.jpg"
    audio_file = "assets/audios/sample_voice.mp4"
    
    sample_output = process_multimodal_harvest_request(
        farmer_id="FARMER-UNBIASED-99",
        crop=None,          # Let vision + audio extract it
        volume_kg=None,     # Let audio extract exact 1500 kg
        location=None,      # Let audio extract Bunia
        image_path=image_file if os.path.exists(image_file) else None,
        audio_path=audio_file if os.path.exists(audio_file) else None,
        notes=None          # No textual hints
    )
    
    print("\n=== Agent Final Outcome ===")
    print(sample_output)