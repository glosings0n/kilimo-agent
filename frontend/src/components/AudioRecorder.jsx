import { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Upload, CheckCircle2 } from 'lucide-react';
import { translations } from '../utils/translations';

export default function AudioRecorder({
  setAudioFile,
  audioName,
  setAudioName,
  audioPresetUrl,
  lang
}) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioElementRef = useRef(null);

  const activeAudioUrl = recordedUrl || audioPresetUrl;

  const startCanvasVisualizer = (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasCtx = canvas.getContext('2d');
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = '#0B0F17';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          canvasCtx.fillStyle = '#10B981';
          canvasCtx.beginPath();
          canvasCtx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, [4, 4, 0, 0]);
          canvasCtx.fill();

          x += barWidth;
        }
      };

      draw();
    } catch (e) {
      console.warn("Visualizer init notice:", e);
    }
  };

  const stopCanvasVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedUrl(audioUrl);
        setAudioFile(audioBlob);
        setAudioName("Live Recording (" + new Date().toLocaleTimeString() + ")");
        stopCanvasVisualizer();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      startCanvasVisualizer(stream);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert(t.micError);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      setAudioName(file.name);
      setRecordedUrl(URL.createObjectURL(file));
      setIsPlaying(false);
    }
  };

  const togglePlayback = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-3xl p-5 sm:p-6  space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Mic className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {t.audioTab}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Swahili, French, English dialect perception
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          Audio Ground Truth
        </span>
      </div>

      {/* Recording Visualizer Canvas */}
      {isRecording && (
        <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 p-3 text-center space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs px-2">
            <span className="flex items-center gap-2 text-rose-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              {t.audioRecording}
            </span>
            <span className="font-mono text-emerald-400 font-bold text-sm">
              {formatTime(recordingDuration)}
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={340}
            height={60}
            className="w-full h-16 rounded-lg bg-[#0B0F17] border border-slate-800"
          />
        </div>
      )}

      {/* Controls: Live Record OR Upload */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Record Button */}
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold transition active:scale-95 group cursor-pointer shadow-xs"
          >
            <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center group-hover:scale-110 transition">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            </div>
            <span>{t.audioRecord}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition active:scale-95  animate-pulse cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>{t.audioStopRec} ({formatTime(recordingDuration)})</span>
          </button>
        )}

        {/* Upload Button */}
        <label className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold cursor-pointer transition active:scale-95 shadow-xs">
          <Upload className="w-4 h-4 text-slate-400" />
          <span className="truncate">{t.audioUpload}</span>
          <input
            type="file"
            accept="audio/*,video/mp4,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/wav,audio/ogg,.mp3,.mp4,.m4a,.wav,.ogg,.aac"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Audio Player & Active File Indicator */}
      {activeAudioUrl && (
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={togglePlayback}
              className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition shadow-xs shrink-0 cursor-pointer"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {audioName || "Voice Note Recording"}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{t.audioGroundTruth}</span>
              </div>
            </div>
          </div>

          <audio
            ref={audioElementRef}
            src={activeAudioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}

      {/* Voice Instruction Tip */}
      <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        <strong className="text-slate-200">Tip:</strong> {t.audioHint}
      </div>
    </div>
  );
}
