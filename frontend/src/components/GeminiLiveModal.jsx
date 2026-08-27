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
  Truck
} from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';

export default function GeminiLiveModal({
  isOpen,
  onClose,
  lang = 'en',
  onCommitDispatch
}) {
  const [isAudioLive, setIsAudioLive] = useState(true);
  const [isVideoLive, setIsVideoLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, live, analyzing
  const [audioLevel, setAudioLevel] = useState([20, 45, 70, 90, 60, 30, 80, 50, 65, 40]);
  const [detectedSpecimen, setDetectedSpecimen] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptsEndRef = useRef(null);

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

  useEffect(() => {
    if (isOpen) {
      setConnectionStatus('connecting');
      setTranscripts(initialTranscript[lang] || initialTranscript.en);
      const timer = setTimeout(() => {
        setConnectionStatus('live');
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      stopMediaStream();
    }
  }, [isOpen, lang]);

  // Auto-scroll to newest message in live stream
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Dynamic Audio Visualizer pulse
  useEffect(() => {
    if (!isOpen || !isAudioLive || isMuted) return;
    const interval = setInterval(() => {
      setAudioLevel(prev => prev.map(() => Math.floor(Math.random() * 75) + 20));
    }, 150);
    return () => clearInterval(interval);
  }, [isOpen, isAudioLive, isMuted]);

  // Video Stream handler
  const toggleCamera = async () => {
    if (isVideoLive) {
      stopMediaStream();
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

        // Simulate real-time multimodal vision detection
        setTimeout(() => {
          setDetectedSpecimen({
            crop: "Yellow Flint Maize (Zea mays)",
            grade: "Grade A Standard (Moisture ~12.2%)",
            qualityScore: "98.4% Purity",
            recommendation: "Optimal export & cross-border arbitrage grade"
          });
          setConnectionStatus('live');
          setTranscripts(prev => [
            ...prev,
            {
              sender: 'gemini',
              text: lang === 'sw'
                ? "Nimeona mahindi yako kwenye kamera! Ni Mahindi ya Njano ya Daraja A (Grade A), yamekauka vizuri na hayana wadudu. Soko la Mpaka lina faida ya $615."
                : lang === 'fr'
                ? "Flux vidéo reçu ! Détection visuelle : Maïs jaune Grade A Standard, humidité optimale (~12.2%). Opportunité d'arbitrage max à la Zone Frontalière (+615 $ net)."
                : "Live video feed analyzed! Visual detection: Grade A Flint Maize (optimal ~12.2% moisture, 0 defects). Border Trade Zone guarantees maximum net payout ($615.00).",
              time: "Live"
            }
          ]);
        }, 1800);
      } catch (err) {
        console.warn("Camera permission denied or unavailable:", err);
        setIsVideoLive(true);
        // Fallback simulation mode
        setTimeout(() => {
          setDetectedSpecimen({
            crop: "Flint Maize (Sample Inspection)",
            grade: "Grade A Standard",
            qualityScore: "97.5% Purity",
            recommendation: "High market arbitrage readiness"
          });
        }, 1500);
      }
    }
  };

  const stopMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#090D16] border border-slate-800 rounded-3xl  overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
              <GeminiIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                  Gemini Live Stream
                </h3>
                {/* Responsive Live Beacon: Perfect circle on mobile, pill badge on desktop */}
                <span className="flex sm:inline-flex items-center justify-center w-5 h-5 sm:w-auto sm:h-auto sm:px-2.5 sm:py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0 gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="hidden sm:inline">Live</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Voice & camera ({lang === 'sw' ? 'Kiswahili' : lang === 'fr' ? 'Français' : 'English'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
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
                <div className="w-20 h-20 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center relative z-10">
                  <Mic className="w-9 h-9 stroke-[2.2]" />
                </div>
              </div>

              {/* Dynamic Audio Visualizer Bars */}
              <div className="flex items-center justify-center gap-1.5 h-10">
                {audioLevel.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="w-1.5 rounded-full bg-emerald-400 transition-all duration-150"
                    style={{ height: `${lvl}%` }}
                  />
                ))}
              </div>

              <div className="space-y-1">
                <div className="text-sm font-extrabold text-white tracking-wide">
                  Live voice assistant listening
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
                  <GeminiIcon className="w-3.5 h-3.5" />
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

        {/* Live Bottom Controls Bar (Compact on Phone, 1 Single Line) */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 sm:gap-3 flex-nowrap">
          {/* Camera Toggle */}
          <button
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
            onClick={() => {
              if (onCommitDispatch) onCommitDispatch();
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

