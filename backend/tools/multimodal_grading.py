import os
import json
from google import genai
from google.genai import types
from typing import Dict, Any
from config.models import DEFAULT_GEMINI_MODEL as MODEL_NAME

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

def detect_image_mime(data: bytes) -> str:
    if not data:
        return "image/jpeg"
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return "image/png"
    elif data.startswith(b'\xff\xd8'):
        return "image/jpeg"
    elif data.startswith(b'RIFF') and b'WEBP' in data[:12]:
        return "image/webp"
    elif data.startswith(b'GIF87a') or data.startswith(b'GIF89a'):
        return "image/gif"
    return "image/jpeg"


def detect_audio_mime(data: bytes) -> str:
    if not data:
        return "audio/webm"
    if data.startswith(b'\x1a\x45\xdf\xa3') or b'webm' in data[:30].lower():
        return "audio/webm"
    if data.startswith(b'RIFF') and b'WAVE' in data[:12]:
        return "audio/wav"
    elif data.startswith(b'OggS'):
        return "audio/ogg"
    elif data.startswith(b'ID3') or data.startswith(b'\xff\xfb') or data.startswith(b'\xff\xf3'):
        return "audio/mp3"
    elif b'ftyp' in data[:20] or data.startswith(b'\x00\x00\x00'):
        return "audio/mp4"
    return "audio/webm"


def grade_and_validate_harvest_image(image_bytes: bytes, crop_hint: str = None) -> Dict[str, Any]:
    if not image_bytes or len(image_bytes) < 100:
        return {
            "is_valid_crop": False,
            "rejection_reason": "Image file is empty or corrupted.",
            "confidence_score": 0.0,
            "detected_crop": None,
            "quality_grade": None,
            "defect_percentage": None
        }

    mime_type = detect_image_mime(image_bytes)
    prompt = f"""You are an expert agricultural commodity inspector for KilimoAgent.
Strictly verify if the image represents an agricultural crop or harvest (e.g. maize, cassava, coffee, beans, tomatoes, sorghum, sunflower, rice, sweet potatoes, wheat, tea, avocado, onions, potatoes, vegetables, fruits).
{f"The user claims this is: {crop_hint}." if crop_hint else ""}
If the image is a person, selfie, UI screenshot, text message screenshot, website, graphic artwork, 3D render, document, dark blurred room, vehicle, animal, building, or non-agricultural object, return:
{{ "is_valid_crop": false, "rejection_reason": "L'image ne représente pas une récolte agricole valide. Veuillez télécharger une photo claire de vos produits agricoles (Maïs, Manioc, Café, Haricots, Tomates, etc.).", "confidence_score": 0.0, "detected_crop": null, "quality_grade": null, "defect_percentage": null }}

If valid agricultural crop, return:
{{ "is_valid_crop": true, "detected_crop": "Maize|Cassava|Coffee|Beans|Tomatoes|...", "quality_grade": "Grade A" or "Grade B" or "Specialty Grade", "defect_percentage": 2.1, "moisture_estimated_pct": 12.4, "aflatoxin_risk": "Low (< 4 ppb)", "notes": "Intact kernels/tubers, clean harvest" }}
"""
    try:
        response = genai_client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        if response and response.text:
            parsed = json.loads(response.text.replace("```json", "").replace("```", "").strip())
            if isinstance(parsed, dict) and parsed.get("is_valid_crop") is True and parsed.get("detected_crop"):
                return parsed
            elif isinstance(parsed, dict):
                return {
                    "is_valid_crop": False,
                    "rejection_reason": parsed.get("rejection_reason") or "L'image ne représente pas une récolte agricole valide.",
                    "confidence_score": 0.0,
                    "detected_crop": None,
                    "quality_grade": None,
                    "defect_percentage": None
                }
    except Exception as e:
        print(f"[MULTIMODAL_GRADING] Vision model evaluation error: {e}")

    # Strict Security Safeguard: Never validate an unverified image as a crop
    return {
        "is_valid_crop": False,
        "rejection_reason": "L'image ne représente pas une récolte agricole valide ou ne peut pas être analysée. Veuillez télécharger une photo nette de vos produits agricoles.",
        "confidence_score": 0.0,
        "detected_crop": None,
        "quality_grade": None,
        "defect_percentage": None
    }


def validate_and_transcribe_voice_note(audio_bytes: bytes, lang: str = "en") -> Dict[str, Any]:
    if not audio_bytes or len(audio_bytes) < 100:
        return {
            "is_valid_speech": False,
            "transcript": "",
            "rejection_reason": "Audio recording is empty or inaudible."
        }

    mime_type = detect_audio_mime(audio_bytes)
    prompt = f"""You are an expert agricultural audio transcription service for KilimoAgent.
Listen to the audio. Verify if it contains intelligible speech about agricultural harvests, commodities, prices, or logistics.
Target language hint: {lang}.
If unintelligible noise, silence, music, ambient static, or non-agricultural non-speech audio, return:
{{ "is_valid_speech": false, "transcript": "", "rejection_reason": "Message vocal inaudible ou silence. Veuillez réenregistrer." }}

If valid speech, transcribe it and return:
{{ "is_valid_speech": true, "transcript": "...", "detected_language": "{lang}" }}
"""
    try:
        response = genai_client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        if response and response.text:
            parsed = json.loads(response.text.replace("```json", "").replace("```", "").strip())
            if isinstance(parsed, dict) and parsed.get("is_valid_speech") is True and parsed.get("transcript"):
                return parsed
            elif isinstance(parsed, dict):
                return {
                    "is_valid_speech": False,
                    "transcript": "",
                    "rejection_reason": parsed.get("rejection_reason") or "Message vocal inaudible ou non pertinent."
                }
    except Exception as e:
        print(f"[MULTIMODAL_GRADING] Audio transcription error: {e}")

    # Strict Security Safeguard: Never return fake audio transcription
    return {
        "is_valid_speech": False,
        "transcript": "",
        "rejection_reason": "Le message vocal n'a pas pu être transcrit. Veuillez réenregistrer un vocal clair."
    }

