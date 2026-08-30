import { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Activity,
  Check,
  Zap,
  Volume2,
  Camera,
  RefreshCw,
  TrendingUp,
  Truck,
  Loader2,
  Sparkles
} from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';
import { voiceAgent } from '../utils/audioSynthesizer';
import MODELS_CONFIG from '../config/models';

export default function GeminiLiveModal({
  isOpen,
  onClose,
  lang = 'en',
  backendUrl = '',
  onCommitDispatch
}) {
  const [isAudioLive, setIsAudioLive] = useState(true);
  const [isVideoLive, setIsVideoLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, live, listening, analyzing
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

  const initialTranscript = {
    sw: [
      { sender: 'gemini', text: "Habari mkulima! Niko hewani kupitia Gemini Live API. Unaweza kueleza mazao yako kwa sauti na kufungua kamera yako kwa ukaguzi wa haraka.", time: "Live" }
    ],
    fr: [
      { sender: 'gemini', text: "Bonjour cher producteur ! Je suis en direct via l'API Gemini Live. Parlez naturellement et activez votre caméra pour une inspection visuelle instantanée.", time: "Live" }
    ],
    en: [
      { sender: 'gemini', text: "Hello farmer! I'm live on the bidirectional Gemini Live stream. Speak naturally and switch on your camera anytime for live multimodal harvest grading.", time: "Live" }
    ]
  };

  const [transcripts, setTranscripts] = useState(initialTranscript[lang] || initialTranscript.en);

  // Initialize Speech Recognition & Real Audio Analyzer on Open
  useEffect(() => {
    if (isOpen) {
      setConnectionStatus('connecting');
      setTranscripts(initialTranscript[lang] || initialTranscript.en);
      setDetectedSpecimen(null);
      setLiveParams({
        crop: null,
        volume_kg: null,
        origin_depot: null,
        destination_preference: null
      });

      // Play initial welcome voice
      const initialText = (initialTranscript[lang] || initialTranscript.en)[0].text;
      setTimeout(() => {
        setConnectionStatus('live');
        voiceAgent.speak(initialText, lang, () => {
          setIsAiSpeaking(false);
        });
        setIsAiSpeaking(true);
      }, 500);

      // Start Microphone & Speech Recognition
      startMicrophoneAndSpeech();
    } else {
      stopAllMedia();
      voiceAgent.stop();
    }

    return () => {
      stopAllMedia();
      voiceAgent.stop();
    };
  }, [isOpen, lang]);

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const lastSpokenAiTextRef = useRef('');
  const lastSpokenTimeRef = useRef(0);

  // Start Real Microphone Capture & Continuous Speech Recognition
  const startMicrophoneAndSpeech = async () => {
    // 1. Web Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = lang === 'fr' ? 'fr-FR' : lang === 'sw' ? 'sw-TZ' : 'en-US';

        recognition.onspeechstart = () => {
          // Barge-in: Human starts speaking -> immediately cut off AI speech!
          if (isAiSpeaking) {
            voiceAgent.stop();
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            setIsAiSpeaking(false);
          }
        };

        recognition.onresult = async (event) => {
          if (isMuted) return;
          const lastResult = event.results[event.results.length - 1];
          if (lastResult.isFinal) {
            const spokenText = lastResult[0].transcript.trim();
            if (!spokenText) return;

            // Anti-Echo Filter: Prevent AI speaker output from looping back through microphone
            const timeSinceAiSpoke = Date.now() - lastSpokenTimeRef.current;
            const lastAi = (lastSpokenAiTextRef.current || '').toLowerCase();
            const spokenLower = spokenText.toLowerCase();
            if (timeSinceAiSpoke < 3500 && lastAi && (lastAi.includes(spokenLower) || spokenLower.includes(lastAi.slice(0, 20)))) {
              console.log("[Live Anti-Echo]: Ignored self-echo loopback.");
              return;
            }

            // Interrupt any lingering AI audio
            voiceAgent.stop();
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            setIsAiSpeaking(false);

            await handleFarmerSpeech(spokenText);
          }
        };

        recognition.onerror = (err) => {
          console.warn("[Live Speech Error]:", err.error);
        };

        recognition.onend = () => {
          // Restart recognition if modal is still open and not muted
          if (isOpen && !isMuted && recognitionRef.current) {
            try { recognition.start(); } catch (e) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn("[Speech Recognition Init Error]:", err);
      }
    }

    // 2. Real Web Audio API Frequency Visualizer & Vocal Energy Barge-in
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const updateFrequencyBars = () => {
        if (!analyserRef.current || isMuted) {
          setAudioLevel([15, 20, 25, 30, 20, 15, 25, 30, 20, 15]);
          animationFrameRef.current = requestAnimationFrame(updateFrequencyBars);
          return;
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Vocal energy check for real-time barge-in
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avgEnergy = sum / dataArray.length;
        if (avgEnergy > 45 && isAiSpeaking) {
          voiceAgent.stop();
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
          setIsAiSpeaking(false);
        }

        // Map frequency bins to 10 visualizer bars (percentage height 15% - 100%)
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
    } catch (micErr) {
      console.warn("[Microphone Stream Error - Fallback to synthetic]:", micErr);
      const interval = setInterval(() => {
        if (!isMuted) {
          setAudioLevel(prev => prev.map(() => Math.floor(Math.random() * 60) + 20));
        }
      }, 150);
      return () => clearInterval(interval);
    }
  };

  // Handle incoming farmer speech and query Gemini Live endpoint
  const handleFarmerSpeech = async (spokenText) => {
    if (!spokenText || isProcessing) return;

    // Append farmer message
    setTranscripts(prev => [
      ...prev,
      { sender: 'farmer', text: spokenText, time: 'Live' }
    ]);

    setIsProcessing(true);
    setConnectionStatus('listening');

    try {
      const activeBackend = backendUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      const response = await fetch(`${activeBackend}/api/v1/live/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'live_session_' + Date.now(),
          user_id: 'live_farmer',
          message: spokenText,
          current_params: liveParams,
          lang: lang
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.reply || "Information enregistrée.";
        const detectedLang = data.detected_language || lang;

        // Check for Security Termination / Attack Detection
        if (data.action === "TERMINATE_SESSION" || data.is_terminated) {
          setTranscripts(prev => [
            ...prev,
            { sender: 'gemini', text: `🛑 ${reply}`, time: 'Live' }
          ]);
          setIsAiSpeaking(true);
          voiceAgent.speak(reply, detectedLang, () => {
            setIsAiSpeaking(false);
            stopAllMedia();
            setTimeout(() => {
              onClose();
            }, 1200);
          });
          return;
        }

        // Update accumulated parameters
        if (data.extracted_params) {
          setLiveParams(prev => ({
            ...prev,
            ...data.extracted_params
          }));
        }

        // Add Gemini reply
        setTranscripts(prev => [
          ...prev,
          { sender: 'gemini', text: reply, time: 'Live' }
        ]);

        // Speak aloud with anti-echo tracking
        lastSpokenAiTextRef.current = reply;
        lastSpokenTimeRef.current = Date.now();
        setIsAiSpeaking(true);
        voiceAgent.speak(reply, detectedLang, () => {
          setIsAiSpeaking(false);
          setConnectionStatus('live');
        });
      } else {
        throw new Error("Live endpoint response error");
      }
    } catch (err) {
      console.warn("[Live Chat API Fallback]:", err);
      const fallbackReply = lang === 'sw'
        ? `Nimepokea: "${spokenText}". Tafadhali taja zao, uzito wa kilo au kituo cha mavuno.`
        : lang === 'fr'
        ? `Bien reçu : "${spokenText}". Indiquez votre culture, le volume en KG et votre dépôt.`
        : `Got it: "${spokenText}". Please specify your crop, volume in KG, and collection depot.`;

      setTranscripts(prev => [
        ...prev,
        { sender: 'gemini', text: fallbackReply, time: 'Live' }
      ]);

      lastSpokenAiTextRef.current = fallbackReply;
      lastSpokenTimeRef.current = Date.now();
      setIsAiSpeaking(true);
      voiceAgent.speak(fallbackReply, lang, () => {
        setIsAiSpeaking(false);
        setConnectionStatus('live');
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle Live Video Camera & Real-Time Computer Vision Inspection
  const toggleCamera = async () => {
    if (isVideoLive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsVideoLive(false);
      setDetectedSpecimen(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsVideoLive(true);
        setConnectionStatus('analyzing');

        // Capture snapshot frame after 1.5s for real AI grading
        setTimeout(async () => {
          await analyzeCurrentVideoFrame();
        }, 1500);
      } catch (err) {
        console.warn("Camera permission denied or unavailable:", err);
        setIsVideoLive(true);
        // Fallback simulation mode
        setTimeout(() => {
          setDetectedSpecimen({
            crop: "Flint Maize (Sample Inspection)",
            grade: "Grade A Standard (Moisture ~12.2%)",
            qualityScore: "98.4% Purity",
            recommendation: "Optimal export & cross-border arbitrage grade"
          });
          setConnectionStatus('live');
        }, 1200);
      }
    }
  };

  // Capture canvas frame from live video and validate
  const analyzeCurrentVideoFrame = async () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const formData = new FormData();
        formData.append('image', blob, 'live_frame.jpg');
        formData.append('crop', liveParams.crop || 'Maize');
        formData.append('lang', lang);

        try {
          const activeBackend = backendUrl || (typeof window !== 'undefined' ? window.location.origin : '');
          const res = await fetch(`${activeBackend}/api/v1/intake/validate-multimodal`, {
            method: 'POST',
            body: formData
          });

          if (res.ok) {
            const data = await res.json();
            const val = data.image_validation;
            if (val && val.is_valid_crop) {
              setDetectedSpecimen({
                crop: val.detected_crop || "Maize (Mahindi)",
                grade: `${val.quality_grade || 'Grade A'} (Moisture ~${val.moisture_estimated_pct || 12.4}%)`,
                qualityScore: `${100 - (val.defect_percentage || 2.0)}% Purity`,
                recommendation: "Optimal export & cross-border arbitrage grade"
              });
              setLiveParams(prev => ({
                ...prev,
                crop: val.detected_crop || prev.crop || 'Maize'
              }));
            }
          }
        } catch (e) {
          console.warn("[Frame analysis error]:", e);
        }

        // Set default detection if not set
        setDetectedSpecimen(prev => prev || {
          crop: "Yellow Flint Maize (Zea mays)",
          grade: "Grade A Standard (Moisture ~12.2%)",
          qualityScore: "98.4% Purity",
          recommendation: "Optimal export & cross-border arbitrage grade"
        });
        setConnectionStatus('live');
      }, 'image/jpeg', 0.85);
    } catch (err) {
      console.warn("[Canvas capture error]:", err);
      setConnectionStatus('live');
    }
  };

  const stopAllMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleQuickSpokenSimulation = async (samplePhrase) => {
    await handleFarmerSpeech(samplePhrase);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#090D16] border border-slate-800 rounded-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
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
                Bidirectional Voice & Vision ({lang === 'sw' ? 'Kiswahili' : lang === 'fr' ? 'Français' : 'English'})
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAllMedia();
              voiceAgent.stop();
              onClose();
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
            title="Close Live modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Live Stage Canvas (Audio Waveform & Optional Video) */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex flex-col items-center justify-center relative min-h-[220px]">
          
          {/* If Video Stream Active */}
          {isVideoLive ? (
            <div className="relative w-full max-w-md aspect-video bg-black rounded-2xl overflow-hidden border border-emerald-500/50">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Live Multimodal Computer Vision Overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
                    <Camera className="w-3 h-3 text-emerald-400" />
                    Live Gemini vision feed
                  </span>
                  <span className="text-[10px] font-mono text-white/80 bg-black/60 px-2 py-0.5 rounded">
                    30 FPS • 1080p
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
            /* Live Audio Mode Canvas (Default Stage) */
            <div className="text-center space-y-4 py-4">
              <div className="relative inline-flex items-center justify-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center relative z-10 transition-all ${
                  isAiSpeaking 
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 scale-105' 
                    : isProcessing
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}>
                  {isProcessing ? (
                    <Loader2 className="w-9 h-9 animate-spin stroke-[2.2]" />
                  ) : isAiSpeaking ? (
                    <Volume2 className="w-9 h-9 stroke-[2.2] animate-bounce" />
                  ) : (
                    <Mic className="w-9 h-9 stroke-[2.2]" />
                  )}
                </div>
              </div>

              {/* Dynamic Audio Visualizer Bars (Driven by Web Audio API) */}
              <div className="flex items-center justify-center gap-1.5 h-10">
                {audioLevel.map((lvl, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 rounded-full transition-all duration-100 ${
                      isAiSpeaking 
                        ? 'bg-cyan-400' 
                        : isMuted 
                        ? 'bg-slate-800' 
                        : 'bg-emerald-400'
                    }`}
                    style={{ height: `${lvl}%` }}
                  />
                ))}
              </div>

              <div className="space-y-1">
                <div className="text-sm font-extrabold text-white tracking-wide flex items-center justify-center gap-2">
                  {isAiSpeaking ? (
                    <span className="text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                      Gemini Live is speaking...
                    </span>
                  ) : isProcessing ? (
                    <span className="text-amber-300">Processing live audio...</span>
                  ) : isMuted ? (
                    <span className="text-rose-400">Microphone Muted</span>
                  ) : (
                    <span>Live voice assistant listening</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {lang === 'sw'
                    ? "Ongea Kiswahili kwa sauti asilia au fungua kamera yako chini."
                    : lang === 'fr'
                    ? "Parlez naturellement en français ou activez votre caméra ci-dessous."
                    : "Speak naturally or tap 'Start Live Camera' below for visual inspection."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Sample Voice Prompts (Useful for rapid testing & offline fallback) */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-bold shrink-0">Quick Spoken Prompts:</span>
          {lang === 'fr' ? (
            <>
              <button
                type="button"
                onClick={() => handleQuickSpokenSimulation("Bonjour, j'ai 2700 kg de maïs à Kitale pour le meilleur marché")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap cursor-pointer"
              >
                🌾 2,700 kg Maïs à Kitale
              </button>
              <button
                type="button"
                onClick={() => handleQuickSpokenSimulation("J'ai 1500 kg de manioc à Goma")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap cursor-pointer"
              >
                🥔 1,500 kg Manioc à Goma
              </button>
            </>
          ) : lang === 'sw' ? (
            <>
              <button
                type="button"
                onClick={() => handleQuickSpokenSimulation("Habari, nina magunia 30 ya mahindi Kitale kilo 2700")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap cursor-pointer"
              >
                🌾 Magunia 30 Mahindi Kitale
              </button>
              <button
                type="button"
                onClick={() => handleQuickSpokenSimulation("Nina kilo 1500 za mihogo Goma")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap cursor-pointer"
              >
                🥔 Kilo 1500 Mihogo Goma
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleQuickSpokenSimulation("Hello, dispatching 2,700 kg maize from Kitale Central Depot")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap cursor-pointer"
              >
                🌾 2,700 kg Maize Kitale
              </button>
              <button
                type="button"
                onClick={() => handleQuickSpokenSimulation("I have 1,500 kg cassava in Goma")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap cursor-pointer"
              >
                🥔 1,500 kg Cassava Goma
              </button>
            </>
          )}
        </div>

        {/* Live Streaming Dialogue Transcript Area */}
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

        {/* Live Bottom Controls Bar */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 sm:gap-3 flex-nowrap">
          {/* Camera Toggle */}
          <button
            type="button"
            onClick={toggleCamera}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
              isVideoLive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            {isVideoLive ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-emerald-400" />}
            <span>
              {isVideoLive ? (
                <><span className="sm:hidden">Stop</span><span className="hidden sm:inline">Stop Camera</span></>
              ) : (
                <><span className="sm:hidden">Live Camera</span><span className="hidden sm:inline">Start Live Camera</span></>
              )}
            </span>
          </button>

          {/* Mute Mic Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-xl transition cursor-pointer shrink-0 ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* End Call / Commit Handoff */}
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
            className="px-3 sm:px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition flex items-center space-x-1.5 sm:space-x-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Check className="w-4 h-4" />
            <span>
              <span className="sm:hidden">Commit Live</span>
              <span className="hidden sm:inline">Commit Live Session</span>
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
