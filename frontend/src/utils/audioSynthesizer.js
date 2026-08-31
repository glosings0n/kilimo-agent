/**
 * Client-side Speech Synthesis Utility for multimodal audio playback
 */
export class MultimodalVoiceAgent {
  constructor() {
    this.synth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.voices = [];

    if (this.synth) {
      this.voices = this.synth.getVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          if (this.synth) {
            this.voices = this.synth.getVoices();
          }
        };
      }
    }
  }

  cleanTextForSpeech(rawText) {
    if (!rawText) return '';
    return rawText
      // Remove URLs
      .replace(/https?:\/\/\S+/gi, '')
      // Remove markdown bold, italic, code, headers
      .replace(/[*_#`~]+/g, ' ')
      // Remove bullets and symbols
      .replace(/[•▪—–\-]{2,}/g, ' ')
      .replace(/^[•▪\-\*]\s+/gm, '')
      // Remove emojis
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  speak(text, lang = 'en', onEnd = () => {}) {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    this.stop();

    const clean = this.cleanTextForSpeech(text);
    if (!clean || clean.length < 2) {
      if (onEnd) onEnd();
      return;
    }

    // Refresh voices if list was empty
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }

    // Map language code
    let targetLangCode = 'en-US';
    if (lang === 'fr') targetLangCode = 'fr-FR';
    if (lang === 'sw') targetLangCode = 'sw-TZ';

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = targetLangCode;
    utterance.rate = lang === 'sw' ? 0.95 : 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick best matching voice
    if (this.voices && this.voices.length > 0) {
      let matchedVoice = null;
      if (lang === 'fr') {
        matchedVoice = this.voices.find(v => v.lang.toLowerCase().startsWith('fr'));
      } else if (lang === 'sw') {
        matchedVoice = this.voices.find(v => v.lang.toLowerCase().startsWith('sw')) ||
                       this.voices.find(v => v.name.toLowerCase().includes('swahili')) ||
                       this.voices.find(v => v.lang.toLowerCase().startsWith('en-ke')) ||
                       this.voices.find(v => v.lang.toLowerCase().startsWith('en-za')) ||
                       this.voices.find(v => v.lang.toLowerCase().startsWith('en'));
      } else {
        matchedVoice = this.voices.find(v => v.lang.toLowerCase().startsWith('en'));
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    let isCompleted = false;
    const finish = () => {
      if (!isCompleted) {
        isCompleted = true;
        this.isPlaying = false;
        this.currentUtterance = null;
        if (onEnd) onEnd();
      }
    };

    utterance.onend = () => finish();
    utterance.onerror = (e) => {
      console.warn("[VoiceAgent TTS Warning]:", e);
      finish();
    };

    // Safety timeout in case browser TTS gets frozen
    const estimatedSeconds = Math.max(3, Math.ceil(clean.length / 12));
    const safetyTimer = setTimeout(() => {
      if (this.isPlaying) {
        finish();
      }
    }, estimatedSeconds * 1000 + 1500);

    const originalFinish = finish;
    utterance.onend = () => {
      clearTimeout(safetyTimer);
      originalFinish();
    };

    try {
      this.isPlaying = true;
      this.currentUtterance = utterance;
      // Resume in case Chrome suspended speech synthesis
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.speak(utterance);
    } catch (err) {
      console.warn("[VoiceAgent speak error]:", err);
      clearTimeout(safetyTimer);
      finish();
    }
  }

  stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
      this.isPlaying = false;
      this.currentUtterance = null;
    }
  }
}

export const voiceAgent = new MultimodalVoiceAgent();
