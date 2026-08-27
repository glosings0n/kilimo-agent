/**
 * Client-side Speech Synthesis Utility for multimodal audio playback
 */
export class MultimodalVoiceAgent {
  constructor() {
    this.synth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
    this.currentUtterance = null;
    this.isPlaying = false;
  }

  speak(text, lang = 'en', onEnd = () => {}) {
    if (!this.synth) return;

    this.stop();

    // Map language code
    let voiceLang = 'en-US';
    if (lang === 'fr') voiceLang = 'fr-FR';
    if (lang === 'sw') voiceLang = 'sw-TZ'; // fallback to available African/English/French voice if Swahili not installed

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick best matching voice if available
    const voices = this.synth.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(lang)) || voices.find(v => v.lang.startsWith('en'));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      this.isPlaying = false;
      onEnd();
    };

    utterance.onerror = () => {
      this.isPlaying = false;
      onEnd();
    };

    this.isPlaying = true;
    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      this.currentUtterance = null;
    }
  }
}

export const voiceAgent = new MultimodalVoiceAgent();
