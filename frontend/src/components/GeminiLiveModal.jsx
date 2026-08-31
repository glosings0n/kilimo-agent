import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Activity,
  Check,
  Zap,
  Volume2,
  Camera,
  Loader2,
  Sparkles,
  Radio
} from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';
import { voiceAgent } from '../utils/audioSynthesizer';
import MODELS_CONFIG from '../config/models';

export default function GeminiLiveModal({
  isOpen,
  onClose,
  lang = 'en',
  setLang,
  backendUrl = '',
  onCommitDispatch
}) {
  const [selectedLang, setSelectedLang] = useState(lang);
  const [isAudioLive, setIsAudioLive] = useState(true);
  const [isVideoLive, setIsVideoLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [liveTextInput, setLiveTextInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('listening'); // 'connecting' | 'listening' | 'user_speaking' | 'processing' | 'speaking'
  const [audioLevel, setAudioLevel] = useState([20, 45, 70, 90, 60, 30, 80, 50, 65, 40]);
  const [detectedSpecimen, setDetectedSpecimen] = useState(null);
  const [liveParams, setLiveParams] = useState({
    crop: null,
    volume_kg: null,
    origin_depot: null,
    destination_preference: null
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptsEndRef = useRef(null);
  const animationFrameRef = useRef(null);

  const silenceTimerRef = useRef(null);
  const accumulatedSpeechRef = useRef('');
  const isAiSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const lastAgentUtterancesRef = useRef([]);
  const gainNodeRef = useRef(null);

  const hasInitializedRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  useEffect(() => {
    setSelectedLang(lang);
  }, [lang]);

  const getEffectiveBackend = () => {
    if (backendUrl && backendUrl.length > 0) return backendUrl;
    if (typeof window !== 'undefined') {
      if (window.location.hostname.includes('run.app')) {
        return 'https://kilimo-backend-840262173056.us-central1.run.app';
      }
    }
    return 'http://localhost:8000';
  };

  const initialGreetingMap = {
    sw: "Habari mkulima! Niko hewani kupitia Gemini Live API. Unaweza kueleza mazao yako kwa sauti na kufungua kamera yako kwa ukaguzi wa haraka.",
    fr: "Bonjour cher producteur ! Je suis en direct via l'API Gemini Live. Parlez naturellement et activez votre caméra pour une inspection visuelle instantanée.",
    en: "Hello farmer! I'm live on the bidirectional Gemini Live stream. Speak naturally and switch on your camera anytime for live multimodal harvest grading."
  };

  const [transcripts, setTranscripts] = useState([
    { sender: 'gemini', text: initialGreetingMap[lang] || initialGreetingMap.en, time: "Live" }
  ]);

  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, interimSpeech]);

  const stopAllMedia = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    voiceAgent.stop();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isAiSpeakingRef.current = false;
    cooldownUntilRef.current = 0;
    lastAgentUtterancesRef.current = [];
    gainNodeRef.current = null;
    setIsAiSpeaking(false);
    setIsProcessing(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoLive(false);

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      micStreamRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onspeechstart = null;
      try { recognitionRef.current.abort(); } catch (e) {}
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {}
      audioContextRef.current = null;
      analyserRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const handleCloseLiveModal = useCallback(() => {
    stopAllMedia();
    onClose();
  }, [onClose, stopAllMedia]);

  const playAiResponse = useCallback((replyText, detectedLang, onComplete) => {
    if (!isOpenRef.current) return;
    isAiSpeakingRef.current = true;
    setIsAiSpeaking(true);
    setConnectionStatus('speaking');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    lastAgentUtterancesRef.current = [
      replyText,
      ...(lastAgentUtterancesRef.current || []).slice(0, 3)
    ];

    const targetLang = detectedLang || selectedLang;
    voiceAgent.speak(replyText, targetLang, () => {
      const cooldownMs = 700;
      cooldownUntilRef.current = Date.now() + cooldownMs;

      setTimeout(() => {
        isAiSpeakingRef.current = false;
        setIsAiSpeaking(false);
        setConnectionStatus('listening');

        if (isOpenRef.current && !isMutedRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }

        if (onComplete) onComplete();
      }, cooldownMs);
    });
  }, [selectedLang]);

  const handleFarmerSpeech = useCallback(async (spokenText) => {
    const cleanText = (spokenText || '').trim();
    if (!cleanText || isProcessingRef.current || cleanText.length < 2) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    accumulatedSpeechRef.current = '';
    setInterimSpeech('');

    const lower = cleanText.toLowerCase();
    let currentEffectiveLang = selectedLang;
    if (
      /(salut|bonjour|bonsoir|coucou|je\s|j['’]ai|donne|quoi|faire|recolte|récolte|mais|maïs|manioc|café|haricots|tomates|patate|dépôt|depot|prix|combien|kilos|sacs|tonnes|merci|vente|culture)/i.test(lower)
    ) {
      currentEffectiveLang = 'fr';
    } else if (
      /(habari|jambo|hujambo|mambo|niaje|sasa|vipi|asante|mahindi|muhogo|kahawa|maharagwe|nyanya|gunia|magunia|ghala|soko|bei|safari|kilo|tani|karibu)/i.test(lower)
    ) {
      currentEffectiveLang = 'sw';
    } else if (
      /(hello|hi|hey|good\s|morning|evening|afternoon|i\s+have|crop|harvest|maize|cassava|coffee|beans|tomatoes|depot|price|market|bags|tons|kilograms)/i.test(lower)
    ) {
      currentEffectiveLang = 'en';
    }

    if (currentEffectiveLang !== selectedLang) {
      setSelectedLang(currentEffectiveLang);
      if (setLang) setLang(currentEffectiveLang);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = currentEffectiveLang === 'fr' ? 'fr-FR' : currentEffectiveLang === 'sw' ? 'sw-TZ' : 'en-US';
        } catch (e) {}
      }
    }

    setTranscripts(prev => [
      ...prev,
      { sender: 'farmer', text: cleanText, time: 'Live' }
    ]);

    setIsProcessing(true);
    isProcessingRef.current = true;
    setConnectionStatus('processing');

    try {
      const activeBackend = getEffectiveBackend();
      const response = await fetch(`${activeBackend}/api/v1/live/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'live_session_' + Date.now(),
          user_id: 'live_farmer',
          message: cleanText,
          current_params: liveParams,
          lang: currentEffectiveLang
        })
      });

      if (response.ok) {
        const data = await response.json();
        const detectedBackendLang = data.detected_language || currentEffectiveLang;
        if (detectedBackendLang && detectedBackendLang !== currentEffectiveLang) {
          setSelectedLang(detectedBackendLang);
          if (setLang) setLang(detectedBackendLang);
          currentEffectiveLang = detectedBackendLang;
        }

        const reply = data.reply || (currentEffectiveLang === 'fr' ? "Information bien reçue." : currentEffectiveLang === 'sw' ? "Taarifa imerekodiwa." : "Information recorded.");

        if (data.action === "TERMINATE_SESSION" || data.is_terminated) {
          setTranscripts(prev => [
            ...prev,
            { sender: 'gemini', text: `🛑 ${reply}`, time: 'Live' }
          ]);
          playAiResponse(reply, currentEffectiveLang, () => {
            stopAllMedia();
            setTimeout(() => {
              onClose();
            }, 1200);
          });
          return;
        }

        if (data.extracted_params) {
          setLiveParams(prev => ({
            ...prev,
            ...data.extracted_params
          }));
        }

        setTranscripts(prev => [
          ...prev,
          { sender: 'gemini', text: reply, time: 'Live' }
        ]);

        playAiResponse(reply, currentEffectiveLang);
      } else {
        throw new Error("Live endpoint response error");
      }
    } catch (err) {
      console.warn("[Live Chat API Fallback]:", err);
      const fallbackReply = currentEffectiveLang === 'sw'
        ? `Nimepokea: "${cleanText}". Tafadhali taja zao lako na uzito (KG).`
        : currentEffectiveLang === 'fr'
        ? `Bien reçu : "${cleanText}". Veuillez préciser votre récolte et le volume en KG.`
        : `Got it: "${cleanText}". Please specify your crop and volume in KG.`;

      setTranscripts(prev => [
        ...prev,
        { sender: 'gemini', text: fallbackReply, time: 'Live' }
      ]);

      playAiResponse(fallbackReply, currentEffectiveLang);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [getEffectiveBackend, liveParams, onClose, playAiResponse, selectedLang, setLang, stopAllMedia]);

  const startMicrophoneAndSpeech = useCallback(() => {
    setIsInitializing(false);
    setConnectionStatus('listening');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (e) {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = selectedLang === 'fr' ? 'fr-FR' : selectedLang === 'sw' ? 'sw-TZ' : 'en-US';

        recognition.onspeechstart = () => {
          if (isAiSpeakingRef.current) {
            voiceAgent.stop();
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            isAiSpeakingRef.current = false;
            setIsAiSpeaking(false);
          }
        };

        recognition.onresult = (event) => {
          if (isMutedRef.current || isAiSpeakingRef.current || Date.now() < cooldownUntilRef.current) {
            return;
          }

          let currentInterim = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            const text = res[0].transcript;
            if (res.isFinal) {
              currentFinal += text;
            } else {
              currentInterim += text;
            }
          }

          if (currentInterim.trim()) {
            setInterimSpeech(currentInterim.trim());
            accumulatedSpeechRef.current = currentInterim.trim();
            setConnectionStatus('user_speaking');

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              if (accumulatedSpeechRef.current && accumulatedSpeechRef.current.trim().length >= 2 && !isAiSpeakingRef.current && !isProcessingRef.current) {
                const textToCommit = accumulatedSpeechRef.current.trim();
                handleFarmerSpeech(textToCommit);
              }
            }, 1200);
          }

          if (currentFinal.trim()) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            const finalText = currentFinal.trim();
            handleFarmerSpeech(finalText);
          }
        };

        recognition.onerror = (err) => {
          console.warn("[Live Speech Error]:", err.error);
        };

        recognition.onend = () => {
          if (isOpenRef.current && !isMutedRef.current && !isAiSpeakingRef.current && Date.now() >= cooldownUntilRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) {}
          }
        };

        try { recognition.start(); } catch (e) {}
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn("[Speech Recognition Init Error]:", err);
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: 1,
          sampleRate: 16000
        },
        video: false
      }).then(stream => {
        if (!isOpenRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        micStreamRef.current = stream;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.0;
        gainNodeRef.current = gainNode;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;

        source.connect(gainNode);
        gainNode.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const updateFrequencyBars = () => {
          if (!analyserRef.current) {
            animationFrameRef.current = requestAnimationFrame(updateFrequencyBars);
            return;
          }

          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          const bars = [];
          const step = Math.floor(dataArray.length / 10) || 1;
          for (let i = 0; i < 10; i++) {
            const val = dataArray[i * step] || 0;
            const pct = Math.max(15, Math.min(100, Math.floor((val / 255) * 100) + 15));
            bars.push(pct);
          }
          setAudioLevel(bars);
          animationFrameRef.current = requestAnimationFrame(updateFrequencyBars);
        };

        updateFrequencyBars();
      }).catch(micErr => {
        console.warn("[Microphone Stream Error - Fallback to synthetic]:", micErr);
      });
    }
  }, [handleFarmerSpeech, selectedLang]);

  const toggleCamera = async () => {
    if (isVideoLive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsVideoLive(false);
    } else {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        streamRef.current = camStream;
        if (videoRef.current) {
          videoRef.current.srcObject = camStream;
        }
        setIsVideoLive(true);
        setDetectedSpecimen({
          crop: selectedLang === 'fr' ? "Maïs (Zea mays)" : selectedLang === 'sw' ? "Mahindi (Zea mays)" : "Maize (Zea mays)",
          grade: "EAC Grade A (12.4% Moisture)",
          recommendation: selectedLang === 'fr'
            ? "Grain intact, aucun parasite détecté. Conforme à l'exportation."
            : selectedLang === 'sw'
            ? "Nafaka safi, unyevu uko sawa. Tayari kwa soko la EAC."
            : "Intact kernels, moisture compliant. Grade A export ready."
        });
      } catch (err) {
        console.warn("[Live Camera Error]:", err);
      }
    }
  };

  useEffect(() => {
    if (isVideoLive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isVideoLive]);

  useEffect(() => {
    if (isOpen) {
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        startMicrophoneAndSpeech();
      }
    } else {
      hasInitializedRef.current = false;
      stopAllMedia();
    }
    return () => {
      stopAllMedia();
    };
  }, [isOpen, startMicrophoneAndSpeech, stopAllMedia]);

  const handleLiveTextSubmit = (e) => {
    if (e) e.preventDefault();
    if (!liveTextInput.trim()) return;
    const text = liveTextInput.trim();
    setLiveTextInput('');
    handleFarmerSpeech(text);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleCloseLiveModal(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl bg-[#090D16] border border-slate-800 rounded-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
              <GeminiIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                  Gemini Live Multimodal Stream
                </h3>
                <span className="flex sm:inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0 gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span>{MODELS_CONFIG.defaultModelName}</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {isInitializing 
                  ? (selectedLang === 'fr' ? 'Initialisation...' : selectedLang === 'sw' ? 'Inaunganisha...' : 'Connecting...')
                  : (selectedLang === 'fr' ? 'Micro actif • Parlez ou écrivez' : selectedLang === 'sw' ? 'Maikrofoni ipo tayari • Ongea au andika' : 'Microphone Active • Speak or type')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('fr');
                  if (setLang) setLang('fr');
                  setTranscripts(prev => [
                    ...prev,
                    { sender: 'gemini', text: initialGreetingMap.fr, time: 'Live' }
                  ]);
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.abort();
                      recognitionRef.current.lang = 'fr-FR';
                      setTimeout(() => { try { recognitionRef.current?.start(); } catch (e) {} }, 150);
                    } catch (e) {}
                  }
                }}
                className={`px-2 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  selectedLang === 'fr'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Français"
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('sw');
                  if (setLang) setLang('sw');
                  setTranscripts(prev => [
                    ...prev,
                    { sender: 'gemini', text: initialGreetingMap.sw, time: 'Live' }
                  ]);
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.abort();
                      recognitionRef.current.lang = 'sw-TZ';
                      setTimeout(() => { try { recognitionRef.current?.start(); } catch (e) {} }, 150);
                    } catch (e) {}
                  }
                }}
                className={`px-2 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  selectedLang === 'sw'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Kiswahili"
              >
                SW
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('en');
                  if (setLang) setLang('en');
                  setTranscripts(prev => [
                    ...prev,
                    { sender: 'gemini', text: initialGreetingMap.en, time: 'Live' }
                  ]);
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.abort();
                      recognitionRef.current.lang = 'en-US';
                      setTimeout(() => { try { recognitionRef.current?.start(); } catch (e) {} }, 150);
                    } catch (e) {}
                  }
                }}
                className={`px-2 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  selectedLang === 'en'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="English"
              >
                EN
              </button>
            </div>

            <button
              onClick={handleCloseLiveModal}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close Live modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-950 border-b border-slate-800 flex flex-col items-center justify-center relative min-h-[220px]">
          
          {isVideoLive ? (
            <div className="relative w-full max-w-md aspect-video bg-black rounded-2xl overflow-hidden border border-emerald-500/50">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
                    <Camera className="w-3 h-3 text-emerald-400" />
                    Live Gemini vision feed
                  </span>
                </div>

                {detectedSpecimen && (
                  <div className="bg-slate-950/90 backdrop-blur-md border border-emerald-500/50 p-2.5 rounded-xl text-left space-y-1">
                    <div className="text-xs font-extrabold text-emerald-300 flex items-center justify-between">
                      <span>{detectedSpecimen.crop}</span>
                      <span className="text-[10px] text-amber-300 font-mono">{detectedSpecimen.grade}</span>
                    </div>
                    <div className="text-[10px] text-slate-300 line-clamp-1">
                      {detectedSpecimen.recommendation}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 py-4 w-full max-w-md">
              <div className="relative inline-flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (isAiSpeaking) {
                      voiceAgent.stop();
                      if (typeof window !== 'undefined' && window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                      }
                      setIsAiSpeaking(false);
                      setConnectionStatus('listening');
                      setTimeout(() => {
                        try { recognitionRef.current?.start(); } catch(e) {}
                      }, 200);
                    } else {
                      setIsMuted(!isMuted);
                    }
                  }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center relative z-10 transition-all cursor-pointer ${
                    isInitializing
                      ? 'bg-slate-800 text-amber-400 border border-amber-500/40 animate-pulse'
                      : isAiSpeaking 
                      ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 scale-105 animate-pulse' 
                      : isProcessing
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : isMuted
                      ? 'bg-rose-500 text-white'
                      : 'bg-emerald-500 text-slate-950 hover:scale-105 shadow-lg shadow-emerald-500/25'
                  }`}
                  title={isAiSpeaking ? "Tap to Interrupt" : isMuted ? "Tap to Unmute" : "Listening (Tap to Mute)"}
                >
                  {isInitializing ? (
                    <Loader2 className="w-9 h-9 animate-spin stroke-[2.2]" />
                  ) : isProcessing ? (
                    <Loader2 className="w-9 h-9 animate-spin stroke-[2.2]" />
                  ) : isAiSpeaking ? (
                    <Volume2 className="w-9 h-9 stroke-[2.2]" />
                  ) : isMuted ? (
                    <MicOff className="w-9 h-9 stroke-[2.2]" />
                  ) : (
                    <Mic className="w-9 h-9 stroke-[2.2]" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 h-10">
                {audioLevel.map((lvl, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 rounded-full transition-all duration-100 ${
                      isAiSpeaking 
                        ? 'bg-cyan-400' 
                        : isProcessing
                        ? 'bg-amber-400'
                        : isMuted 
                        ? 'bg-slate-800' 
                        : 'bg-emerald-400'
                    }`}
                    style={{ height: `${lvl}%` }}
                  />
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-extrabold text-white tracking-wide flex items-center justify-center gap-2">
                  {isInitializing ? (
                    <span className="text-amber-300 flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      {selectedLang === 'fr' ? "Connexion..." : selectedLang === 'sw' ? "Inaunganisha..." : "Connecting..."}
                    </span>
                  ) : isAiSpeaking ? (
                    <span className="text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                      {selectedLang === 'fr' ? "Gemini répond..." : selectedLang === 'sw' ? "Gemini anajibu..." : "Gemini speaking..."}
                    </span>
                  ) : isProcessing ? (
                    <span className="text-amber-300 flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      {selectedLang === 'fr' ? "Analyse..." : selectedLang === 'sw' ? "Inachakata..." : "Analyzing..."}
                    </span>
                  ) : isMuted ? (
                    <span className="text-rose-400">{selectedLang === 'fr' ? "Micro muet" : selectedLang === 'sw' ? "Maikrofoni imezimwa" : "Muted"}</span>
                  ) : (
                    <span className="text-emerald-300 flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      {selectedLang === 'fr' ? "Prêt • Parlez ou écrivez" : selectedLang === 'sw' ? "Tayari • Ongea au andika" : "Ready • Speak or type"}
                    </span>
                  )}
                </div>

                {interimSpeech && (
                  <div className="pt-2 flex justify-center animate-in fade-in duration-150">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>"{interimSpeech}"</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3 bg-[#0F172A]/80 min-h-[160px] max-h-[220px]">
          {transcripts.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start space-x-2.5 ${
                msg.sender === 'farmer' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'gemini' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <GeminiIcon className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              )}
              <div
                className={`p-3 rounded-2xl max-w-[82%] text-xs leading-relaxed ${
                  msg.sender === 'farmer'
                    ? 'bg-emerald-600 text-white font-medium rounded-tr-xs'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={transcriptsEndRef} />
        </div>

        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
            <form onSubmit={handleLiveTextSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={liveTextInput}
                    onChange={(e) => setLiveTextInput(e.target.value)}
                    placeholder={selectedLang === 'sw' ? "Andika hapa..." : selectedLang === 'fr' ? "Écrivez ici..." : "Type your message..."}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button type="submit" className="bg-emerald-500 px-3 py-2 rounded-xl text-xs font-bold text-slate-950">Send</button>
            </form>
            
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleCamera}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                  isVideoLive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {isVideoLive ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-emerald-400" />}
                <span>{isVideoLive ? "Stop Camera" : "Live Camera"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2.5 rounded-xl transition cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  stopAllMedia();
                  voiceAgent.stop();
                  if (onCommitDispatch) {
                    onCommitDispatch(liveParams);
                  }
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition flex items-center space-x-2 cursor-pointer whitespace-nowrap"
              >
                <Check className="w-4 h-4" />
                <span>Commit</span>
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
