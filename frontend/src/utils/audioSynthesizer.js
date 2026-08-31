/**
 * Client-side Dual-Engine Speech Synthesis Utility for multimodal audio playback.
 * Combines crystal-clear HTML5 Audio Google TTS with Web Speech API fallback to eliminate browser locks.
 */
export class MultimodalVoiceAgent {
  constructor() {
    this.synth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
    this.currentAudio = null;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.voices = [];

    if (this.synth) {
      try {
        this.voices = this.synth.getVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => {
            if (this.synth) {
              this.voices = this.synth.getVoices();
            }
          };
        }
      } catch (e) {}
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

  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
      this.currentUtterance = null;
    }
    this.isPlaying = false;
  }

  speak(text, lang = 'en', onEnd = () => {}) {
    this.stop();

    const clean = this.cleanTextForSpeech(text);
    if (!clean || clean.length < 2) {
      if (onEnd) onEnd();
      return;
    }

    let isCompleted = false;
    const safeOnEnd = () => {
      if (!isCompleted) {
        isCompleted = true;
        this.isPlaying = false;
        this.currentAudio = null;
        this.currentUtterance = null;
        if (onEnd) onEnd();
      }
    };

    // Determine target language code
    let ttsLang = 'en';
    if (lang === 'fr' || lang?.startsWith('fr')) ttsLang = 'fr';
    if (lang === 'sw' || lang?.startsWith('sw')) ttsLang = 'sw';

    // Primary Engine: HTML5 Google TTS Audio Stream (Crystal clear, zero browser lockup)
    const shortChunk = clean.slice(0, 180);
    const encodeText = encodeURIComponent(shortChunk);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLang}&client=tw-ob&q=${encodeText}`;

    try {
      const audio = new Audio(ttsUrl);
      this.currentAudio = audio;
      this.isPlaying = true;

      const audioWatchdog = setTimeout(() => {
        if (this.isPlaying && this.currentAudio === audio) {
          console.warn("[VoiceAgent HTML5 Audio Watchdog]: Audio play timeout, falling back to Web Speech.");
          this.speakBrowserSpeechSynthesis(clean, ttsLang, safeOnEnd);
        }
      }, Math.max(3500, shortChunk.length * 120));

      audio.onended = () => {
        clearTimeout(audioWatchdog);
        safeOnEnd();
      };

      audio.onerror = (err) => {
        clearTimeout(audioWatchdog);
        console.warn("[VoiceAgent HTML5 Audio Error, falling back]:", err);
        this.speakBrowserSpeechSynthesis(clean, ttsLang, safeOnEnd);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((playErr) => {
          clearTimeout(audioWatchdog);
          console.warn("[VoiceAgent Autoplay Notice, falling back]:", playErr);
          this.speakBrowserSpeechSynthesis(clean, ttsLang, safeOnEnd);
        });
      }
    } catch (e) {
      this.speakBrowserSpeechSynthesis(clean, ttsLang, safeOnEnd);
    }
  }

  speakBrowserSpeechSynthesis(cleanText, ttsLang, onEnd) {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }

      let targetLangCode = 'en-US';
      if (ttsLang === 'fr') targetLangCode = 'fr-FR';
      if (ttsLang === 'sw') targetLangCode = 'sw-TZ';

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = targetLangCode;
      utterance.rate = ttsLang === 'sw' ? 0.95 : 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (!this.voices || this.voices.length === 0) {
        this.voices = this.synth.getVoices();
      }

      if (this.voices && this.voices.length > 0) {
        let matchedVoice = null;
        if (ttsLang === 'fr') {
          matchedVoice = this.voices.find(v => v.lang.toLowerCase().startsWith('fr'));
        } else if (ttsLang === 'sw') {
          matchedVoice = this.voices.find(v => v.lang.toLowerCase().startsWith('sw')) ||
                         this.voices.find(v => v.name.toLowerCase().includes('swahili')) ||
                         this.voices.find(v => v.lang.toLowerCase().startsWith('en-ke'));
        } else {
          matchedVoice = this.voices.find(v => v.lang.toLowerCase().startsWith('en'));
        }
        if (matchedVoice) utterance.voice = matchedVoice;
      }

      let isDone = false;
      const finishUtterance = () => {
        if (!isDone) {
          isDone = true;
          this.isPlaying = false;
          this.currentUtterance = null;
          if (onEnd) onEnd();
        }
      };

      utterance.onend = () => finishUtterance();
      utterance.onerror = () => finishUtterance();

      const estWords = cleanText.split(' ').length;
      const watchdogMs = Math.max(3000, estWords * 350);
      const watchdog = setTimeout(() => {
        finishUtterance();
      }, watchdogMs);

      const origOnEnd = utterance.onend;
      utterance.onend = () => {
        clearTimeout(watchdog);
        if (origOnEnd) origOnEnd();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    } catch (err) {
      console.warn("[SpeechSynthesis Exception]:", err);
      if (onEnd) onEnd();
    }
  }
}

export const voiceAgent = new MultimodalVoiceAgent();

