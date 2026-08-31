import os

# Centralized Model Configuration for KilimoAgent Backend
DEFAULT_GEMINI_MODEL = os.getenv("ADK_MODEL", "gemini-3.6-flash")
GUARDRAIL_MODEL = "gemma-2-9b-it"
LIVE_VOICE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.6-flash")
MULTIMODAL_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-3.6-flash")
AUDIO_TRANSCRIPTION_MODEL = os.getenv("GEMINI_AUDIO_MODEL", "gemini-3.6-flash")

def resolve_api_model(model_name: str) -> str:
    """
    Translates hackathon configuration model identifiers (e.g. gemini-3.6-flash)
    to valid Vertex AI / Gemini API endpoint identifiers (gemini-2.5-flash) to prevent 404 NOT_FOUND errors.
    """
    if not model_name:
        return "gemini-2.5-flash"
    if "3.6" in model_name:
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
