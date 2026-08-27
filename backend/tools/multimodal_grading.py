import os
import json
from google import genai
from google.genai import types
from typing import Dict, Any

MODEL_NAME = os.getenv("ADK_MODEL", "gemini-2.5-flash")
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "kilimoagent")
LOCATION = os.getenv("GEMINI_LOCATION", os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"))

try:
    genai_client = genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location=LOCATION
    )
except Exception:
    genai_client = genai.Client()

def grade_and_validate_harvest_image(image_bytes: bytes, crop_hint: str = None) -> Dict[str, Any]:
    prompt = f"""You are an expert agricultural commodity inspector for KilimoAgent.
Strictly verify if the image represents an agricultural crop (e.g. maize, cassava, coffee, beans, tomatoes, sorghum, sunflower, rice).
{f"The user claims this is: {crop_hint}." if crop_hint else ""}
If the image is a person, selfie, document, electronic screen, blurred/dark room, animal, vehicle, or non-agricultural object, return:
{{ "is_valid_crop": false, "rejection_reason": "Not an agricultural crop. Please upload a clear photo of your harvest.", "confidence_score": 0.0, "detected_crop": null, "quality_grade": null, "defect_percentage": null }}

If valid agricultural crop, return:
{{ "is_valid_crop": true, "detected_crop": "...", "quality_grade": "Grade A" or "Grade B" or "Specialty Grade", "defect_percentage": 2.5, "moisture_estimated_pct": 12.8, "aflatoxin_risk": "Low (< 4 ppb)", "notes": "..." }}
"""
    try:
        response = genai_client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        return json.loads(response.text)
    except Exception as e:
        return {
            "is_valid_crop": False,
            "rejection_reason": f"Validation failed: {str(e)}",
            "confidence_score": 0.0,
            "detected_crop": None,
            "quality_grade": None,
            "defect_percentage": None
        }

def validate_and_transcribe_voice_note(audio_bytes: bytes, lang: str = "en") -> Dict[str, Any]:
    prompt = f"""You are an expert agricultural audio transcription service for KilimoAgent.
Listen to the audio. Verify if it contains intelligible speech about agricultural harvests/logistics.
Target language hint: {lang}.
If unintelligible noise, silence, or random background static, return:
{{ "is_valid_speech": false, "transcript": "", "rejection_reason": "Inaudible or silent audio." }}

If valid speech, transcribe it and return:
{{ "is_valid_speech": true, "transcript": "...", "detected_language": "..." }}
"""
    try:
        response = genai_client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type="audio/mp4"),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        return json.loads(response.text)
    except Exception as e:
        return {
            "is_valid_speech": False,
            "transcript": "",
            "rejection_reason": f"Validation failed: {str(e)}"
        }
