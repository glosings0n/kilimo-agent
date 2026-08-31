import os

# Centralized Model Configuration for KilimoAgent Backend
DEFAULT_GEMINI_MODEL = os.getenv("ADK_MODEL", "gemini-2.5-flash")
GUARDRAIL_MODEL = "gemma-2-9b-it"
LIVE_VOICE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.5-flash")
MULTIMODAL_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-2.5-flash")
AUDIO_TRANSCRIPTION_MODEL = os.getenv("GEMINI_AUDIO_MODEL", "gemini-2.5-flash")

MODEL_CONFIG = {
    "default_model": DEFAULT_GEMINI_MODEL,
    "guardrail_model": GUARDRAIL_MODEL,
    "live_model": LIVE_VOICE_MODEL,
    "vision_model": MULTIMODAL_VISION_MODEL,
    "audio_model": AUDIO_TRANSCRIPTION_MODEL
}
