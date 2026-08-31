import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Activity,
  Volume2,
  Camera,
  Radio,
  Send
} from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';

export default function GeminiLiveModal({
  isOpen,
  onClose,
  lang = 'en',
  setLang,
  backendUrl = '',
  onCommitDispatch
}) {
  const [selectedLang, setSelectedLang] = useState(lang);
  const [isVideoLive, setIsVideoLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'connected' | 'speaking' | 'error'
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [transcripts, setTranscripts] = useState([]);
  const [audioLevel, setAudioLevel] = useState([15, 25, 40, 60, 35, 20, 50, 30, 45, 25]);

  const videoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const wsRef = useRef(null);
  const transcriptsEndRef = useRef(null);
  const canvasRef = useRef(null);
  const videoFrameTimerRef = useRef(null);

  // Audio capture references (16kHz PCM)
  const inAudioCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);

  // Audio playback references (24kHz PCM)
  const outAudioCtxRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const activeAudioSourcesRef = useRef([]);

  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  useEffect(() => {
    setSelectedLang(lang);
  }, [lang]);

  // Scroll to bottom on new transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const getEffectiveWsUrl = useCallback(() => {
    if (backendUrl) {
      const wsScheme = backendUrl.startsWith('https') ? 'wss' : 'ws';
      const cleanHost = backendUrl.replace(/^https?:\/\//, '');
      return `${wsScheme}://${cleanHost}/api/v1/live/ws`;
    }
    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      const wsScheme = isHttps ? 'wss' : 'ws';
      if (window.location.hostname.includes('run.app')) {
        return `wss://kilimo-backend-840262173056.us-central1.run.app/api/v1/live/ws`;
      }
      return `${wsScheme}://${window.location.hostname}:8000/api/v1/live/ws`;
    }
    return 'ws://localhost:8000/api/v1/live/ws';
  }, [backendUrl]);

  // Stop all playback audio
  const stopAllPlayback = useCallback(() => {
    activeAudioSourcesRef.current.forEach(src => {
      try { src.stop(); } catch (e) {}
    });
    activeAudioSourcesRef.current = [];
    if (outAudioCtxRef.current) {
      nextPlayTimeRef.current = outAudioCtxRef.current.currentTime;
    }
    setIsAiSpeaking(false);
  }, []);

  // Stop all media streams and WebSocket
  const cleanupAllResources = useCallback(() => {
    stopAllPlayback();

    if (videoFrameTimerRef.current) {
      clearInterval(videoFrameTimerRef.current);
      videoFrameTimerRef.current = null;
    }

    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (e) {}
      scriptProcessorRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }

    if (inAudioCtxRef.current) {
      try { inAudioCtxRef.current.close(); } catch (e) {}
      inAudioCtxRef.current = null;
    }

    if (outAudioCtxRef.current) {
      try { outAudioCtxRef.current.close(); } catch (e) {}
      outAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }

    setConnectionStatus('connecting');
    setIsVideoLive(false);
  }, [stopAllPlayback]);

  // Play incoming 24kHz PCM chunk
  const playPcm24kChunk = useCallback((base64PcmData) => {
    try {
      if (!outAudioCtxRef.current) {
        outAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = outAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Convert Base64 -> Int16Array -> Float32Array
      const rawString = atob(base64PcmData);
      const len = rawString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = rawString.charCodeAt(i);
      }
      const int16Samples = new Int16Array(bytes.buffer);
      const float32Samples = new Float32Array(int16Samples.length);
      for (let i = 0; i < int16Samples.length; i++) {
        float32Samples[i] = int16Samples[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Samples.length, 24000);
      audioBuffer.getChannelData(0).set(float32Samples);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const playTime = Math.max(now, nextPlayTimeRef.current);
      source.start(playTime);
      nextPlayTimeRef.current = playTime + audioBuffer.duration;

      activeAudioSourcesRef.current.push(source);
      source.onended = () => {
        activeAudioSourcesRef.current = activeAudioSourcesRef.current.filter(s => s !== source);
        if (activeAudioSourcesRef.current.length === 0 && ctx.currentTime >= nextPlayTimeRef.current) {
          setIsAiSpeaking(false);
        }
      };

      setIsAiSpeaking(true);

      // Animate visualizer when AI is speaking
      setAudioLevel(prev => prev.map((_, i) => Math.floor(25 + Math.random() * 65)));
    } catch (err) {
      console.warn('[Gemini Live Audio Playback Error]:', err);
    }
  }, []);

  // Initialize Microphone 16kHz Raw PCM capture
  const initMicrophoneCapture = useCallback(async (ws) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      inAudioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) {
          setAudioLevel([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
          return;
        }

        const float32 = e.inputBuffer.getChannelData(0);
        // Convert Float32 -> Int16
        const int16 = new Int16Array(float32.length);
        let sum = 0;
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          sum += Math.abs(s);
        }

        const avgVolume = sum / float32.length;

        // Dynamic audio wave visualizer calculation
        if (avgVolume > 0.005) {
          const scaled = Math.min(1, avgVolume * 15);
          setAudioLevel(prev => prev.map((_, idx) => {
            const wave = Math.sin((Date.now() / 120) + idx * 0.6) * 0.5 + 0.5;
            return Math.max(12, Math.floor(scaled * 75 * wave + Math.random() * 10));
          }));
        } else {
          setAudioLevel(prev => prev.map(val => Math.max(10, Math.floor(val * 0.8))));
        }

        if (ws.readyState !== WebSocket.OPEN) return;

        // Base64 encode Int16 PCM bytes safely
        const bytes = new Uint8Array(int16.buffer);
        let binary = '';
        const chunkSize = 0x4000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        const b64Pcm = btoa(binary);

        ws.send(JSON.stringify({
          type: 'audio_pcm',
          data: b64Pcm
        }));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err) {
      console.warn('[Microphone Live Access Error]:', err);
    }
  }, []);

  // Initialize Camera Stream
  const toggleCameraStream = useCallback(async () => {
    if (isVideoLive) {
      if (videoFrameTimerRef.current) {
        clearInterval(videoFrameTimerRef.current);
        videoFrameTimerRef.current = null;
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsVideoLive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' }
      });
      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsVideoLive(true);

      // Stream JPEG frame at 1fps
      videoFrameTimerRef.current = setInterval(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!videoRef.current || !canvasRef.current) return;

        const videoEl = videoRef.current;
        const canvas = canvasRef.current;
        if (videoEl.videoWidth === 0) return;

        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        const b64Jpeg = dataUrl.split(',')[1];

        if (b64Jpeg) {
          wsRef.current.send(JSON.stringify({
            type: 'image_frame',
            data: b64Jpeg
          }));
        }
      }, 1000);
    } catch (err) {
      console.warn('[Camera Access Error]:', err);
      setIsVideoLive(false);
    }
  }, [isVideoLive]);

  // Establish WebSocket Connection
  useEffect(() => {
    if (!isOpen) return;

    cleanupAllResources();
    setConnectionStatus('connecting');

    const wsUrl = getEffectiveWsUrl();
    console.log('[Gemini Live WS Connecting]:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Gemini Live WS Connected]');
      setConnectionStatus('connected');
      initMicrophoneCapture(ws);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'audio_chunk' && payload.data) {
          playPcm24kChunk(payload.data);
        } else if (payload.type === 'input_transcription' && payload.text) {
          setTranscripts(prev => {
            const last = prev[prev.length - 1];
            if (last && last.sender === 'farmer' && last.isInterim) {
              return [...prev.slice(0, -1), { sender: 'farmer', text: last.text + ' ' + payload.text, time: 'Live' }];
            }
            return [...prev, { sender: 'farmer', text: payload.text, time: 'Live' }];
          });
        } else if (payload.type === 'output_transcription' && payload.text) {
          setTranscripts(prev => {
            const last = prev[prev.length - 1];
            if (last && last.sender === 'gemini' && last.isInterim) {
              return [...prev.slice(0, -1), { sender: 'gemini', text: last.text + payload.text, time: 'Live' }];
            }
            return [...prev, { sender: 'gemini', text: payload.text, time: 'Live', isInterim: true }];
          });
        } else if (payload.type === 'interrupted') {
          stopAllPlayback();
        } else if (payload.type === 'turn_complete') {
          setTranscripts(prev => prev.map(t => ({ ...t, isInterim: false })));
        } else if (payload.type === 'error') {
          console.error('[Gemini Live Server Error]:', payload.message);
          setConnectionStatus('error');
        }
      } catch (e) {
        console.warn('[WebSocket Payload Parse Error]:', e);
      }
    };

    ws.onerror = (err) => {
      console.warn('[WebSocket Live Connection Error]:', err);
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      setConnectionStatus('connecting');
    };

    return () => {
      cleanupAllResources();
    };
  }, [cleanupAllResources, getEffectiveWsUrl, initMicrophoneCapture, isOpen, playPcm24kChunk, stopAllPlayback]);

  // Send Text Message over WebSocket
  const handleSendTextMessage = useCallback(() => {
    if (!textInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const msg = textInput.trim();
    setTextInput('');
    setTranscripts(prev => [...prev, { sender: 'farmer', text: msg, time: 'Live' }]);

    wsRef.current.send(JSON.stringify({
      type: 'text_message',
      text: msg
    }));
  }, [textInput]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 animate-fade-in">
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-4xl h-[90vh] bg-slate-900 border border-emerald-600/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 z-10">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-600 shadow-md">
              <GeminiIcon className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg text-emerald-400">
                  Gemini Live Session
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Audio & Vision Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct voice dialogue & crop inspection
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Language Selector */}
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
              {['fr', 'sw', 'en'].map(code => (
                <button
                  key={code}
                  onClick={() => {
                    setSelectedLang(code);
                    if (setLang) setLang(code);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    selectedLang === code
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Left / Vision Feed & Audio Wave */}
          <div className="w-full md:w-1/2 p-4 flex flex-col items-center justify-center bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800 relative">
            <div className="relative w-full h-full max-h-[380px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner group">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isVideoLive ? 'opacity-100' : 'opacity-0 absolute'
                }`}
              />

              {!isVideoLive && (
                <div className="flex flex-col items-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner">
                    <Camera className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">Camera Off</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Enable your camera to show your harvest or field to Gemini.
                    </p>
                  </div>
                  <button
                    onClick={toggleCameraStream}
                    className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-md transition-all"
                  >
                    <Video className="w-4 h-4" />
                    <span>Turn On Camera</span>
                  </button>
                </div>
              )}

              {isVideoLive && (
                <div className="absolute top-3 left-3 flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-full border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-medium text-emerald-300">Live Vision (1 FPS)</span>
                </div>
              )}
            </div>

            {/* Audio Live Waveform Visualizer */}
            <div className="w-full mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2">
              <div className="flex items-center space-x-1.5 h-12 px-4">
                {audioLevel.map((height, idx) => (
                  <div
                    key={idx}
                    className={`w-2 rounded-full transition-all duration-150 ${
                      isAiSpeaking
                        ? 'bg-teal-400'
                        : isMuted
                        ? 'bg-slate-700'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      height: isMuted ? '8px' : `${Math.max(8, height)}px`
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>
                  {connectionStatus === 'connecting'
                    ? 'Connecting to Gemini Live WS...'
                    : connectionStatus === 'error'
                    ? 'Connection Error - Check API Key'
                    : isAiSpeaking
                    ? 'Gemini Live Speaking...'
                    : isMuted
                    ? 'Microphone Muted'
                    : 'Listening to your voice...'}
                </span>
              </div>
            </div>
          </div>

          {/* Right / Live Transcripts Panel */}
          <div className="w-full md:w-1/2 flex flex-col bg-slate-900/60 p-4 relative">
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              {transcripts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <Radio className="w-10 h-10 text-emerald-500 animate-pulse" />
                  <p className="text-sm font-medium text-slate-300">Live Voice Connected</p>
                  <p className="text-xs max-w-xs text-slate-400">
                    Speak in French, Swahili, or English. Transcripts will stream live below.
                  </p>
                </div>
              )}

              {transcripts.map((t, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${
                    t.sender === 'farmer' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1 text-[11px] text-slate-400 font-medium">
                    <span>{t.sender === 'farmer' ? 'Farmer' : 'Gemini Live'}</span>
                    <span>•</span>
                    <span>{t.time}</span>
                  </div>

                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      t.sender === 'farmer'
                        ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
                        : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {t.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptsEndRef} />
            </div>

            {/* Bottom Controls & Input */}
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendTextMessage()}
                  placeholder="Type a message or speak into your microphone..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  onClick={handleSendTextMessage}
                  disabled={!textInput.trim()}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3 rounded-2xl border transition-all ${
                      isMuted
                        ? 'bg-rose-900/40 border-rose-500/50 text-rose-300'
                        : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={toggleCameraStream}
                    className={`p-3 rounded-2xl border transition-all ${
                      isVideoLive
                        ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isVideoLive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
                >
                  End Live Session
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

