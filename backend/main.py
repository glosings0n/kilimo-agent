import os
import shutil
import uuid
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agent import process_multimodal_harvest_request

app = FastAPI(
    title="KilimoAgent Enterprise Orchestrator API",
    description="Autonomous agricultural commodity arbitrage and freight dispatch engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/tmp/kilimo_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _clean_str(val: Optional[str]) -> Optional[str]:
    """Converts empty strings or whitespace-only inputs to None."""
    if val is None:
        return None
    cleaned = str(val).strip()
    return cleaned if cleaned else None

@app.get("/")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "KilimoAgent Backend",
        "engine": "gemini-3.6-flash",
        "guardrail": "gemma-2-9b-it"
    }

@app.post("/api/v1/dispatch")
async def trigger_harvest_dispatch(
    farmer_id: Optional[str] = Form(None),
    crop: Optional[str] = Form(None),
    volume_kg: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
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
            notes=clean_notes
        )

        return {
            "success": True,
            "farmer_id": clean_farmer_id or "AUTONOMOUSLY_ASSIGNED",
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