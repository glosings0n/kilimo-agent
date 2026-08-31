import os

# Centralized Model Configuration for KilimoAgent Backend (Gemini 3.6 Hackathon Edition)
DEFAULT_GEMINI_MODEL = os.getenv("ADK_MODEL", "gemini-3.6-flash")
GUARDRAIL_MODEL = "gemma-2-9b-it"
LIVE_VOICE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.6-flash")
MULTIMODAL_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-3.6-flash")
AUDIO_TRANSCRIPTION_MODEL = os.getenv("GEMINI_AUDIO_MODEL", "gemini-3.6-flash")

def resolve_api_model(model_name: str) -> str:
    """
    Returns the requested Gemini model identifier.
    Defaults to gemini-3.6-flash as mandated by Hackathon requirements.
    """
    if not model_name:
        return "gemini-3.6-flash"
    return model_name

API_GEMINI_MODEL = DEFAULT_GEMINI_MODEL
API_LIVE_MODEL = LIVE_VOICE_MODEL
API_VISION_MODEL = MULTIMODAL_VISION_MODEL
API_AUDIO_MODEL = AUDIO_TRANSCRIPTION_MODEL

MODEL_CONFIG = {
    "default_model": DEFAULT_GEMINI_MODEL,
    "guardrail_model": GUARDRAIL_MODEL,
    "live_model": LIVE_VOICE_MODEL,
    "vision_model": MULTIMODAL_VISION_MODEL,
    "audio_model": AUDIO_TRANSCRIPTION_MODEL,
    "api_model": API_GEMINI_MODEL
}
