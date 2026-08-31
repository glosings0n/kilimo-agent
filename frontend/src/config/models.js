// Centralized Model Configuration for KilimoAgent Frontend
// MUST stay in sync with backend/config/models.py
export const MODELS_CONFIG = {
  defaultModelId: "gemini-2.5-flash",
  defaultModelName: "Gemini 2.5 Flash",
  defaultModelBadge: "Gemini 2.5 Flash",
  guardrailModelName: "Gemma 2 (9B-IT)",
  liveVoiceModelId: "gemini-2.5-flash",
  liveVoiceModelName: "Gemini Live (2.5 Flash)",
  multimodalVisionName: "Gemini 2.5 Flash Vision",
  audioTranscriptionName: "Gemini 2.5 Flash Audio",
  adkAgentName: "Google ADK Agent (kilimo_dispatch_agent)"
};

export default MODELS_CONFIG;
