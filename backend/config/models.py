import os

# Centralized Model Configuration for KilimoAgent Backend
DEFAULT_GEMINI_MODEL = os.getenv("ADK_MODEL", "gemini-2.5-flash")
GUARDRAIL_MODEL = "gemma-2-9b-it"
LIVE_VOICE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.5-flash")
MULTIMODAL_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-2.5-flash")
AUDIO_TRANSCRIPTION_MODEL = os.getenv("GEMINI_AUDIO_MODEL", "gemini-2.5-flash")

def resolve_api_model(model_name: str) -> str:
    """
    Returns a valid Gemini model identifier.
    Maps non-standard names like gemini-3.6-flash to gemini-2.5-flash.
    """
    if not model_name or "3.6" in model_name or "3.1" in model_name:
        return "gemini-2.5-flash"
    return model_name

API_GEMINI_MODEL = resolve_api_model(DEFAULT_GEMINI_MODEL)
API_LIVE_MODEL = resolve_api_model(LIVE_VOICE_MODEL)
API_VISION_MODEL = resolve_api_model(MULTIMODAL_VISION_MODEL)
API_AUDIO_MODEL = resolve_api_model(AUDIO_TRANSCRIPTION_MODEL)

MODEL_CONFIG = {
    "default_model": DEFAULT_GEMINI_MODEL,
    "guardrail_model": GUARDRAIL_MODEL,
    "live_model": LIVE_VOICE_MODEL,
    "vision_model": MULTIMODAL_VISION_MODEL,
    "audio_model": AUDIO_TRANSCRIPTION_MODEL,
    "api_model": API_GEMINI_MODEL
}
