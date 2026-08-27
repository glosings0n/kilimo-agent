import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Eye, CheckCircle2, Scan } from 'lucide-react';
import { translations } from '../utils/translations';

export default function CameraCapture({
  setImageFile,
  imagePreview,
  setImagePreview,
  isScanning,
  lang
}) {
  const t = translations[lang] || translations.en;
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const file = new File([blob], `harvest_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setImageFile(file);
      setImagePreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      stopCamera();
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {t.imageTab}
            </h3>
            <p className="text-[11px] text-slate-400">
              Gemini 3.6 Flash Computer Vision Inspection
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          Visual Quality A/B
        </span>
      </div>

      {/* Viewport / Preview Area */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[16/10] flex items-center justify-center group">
        {/* Live Camera View */}
        {isCameraActive ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Viewfinder Reticle */}
            <div className="absolute inset-6 border border-white/30 rounded-xl pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
              </div>
              <div className="text-center text-[10px] text-white/70 bg-black/50 px-2 py-0.5 rounded-full mx-auto backdrop-blur-sm">
                Center harvest crop in frame
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
              </div>
            </div>

            {/* Bottom Capture Action */}
            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={capturePhoto}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/30 flex items-center gap-2 active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>{t.imageCaptureBtn}</span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold backdrop-blur-sm border border-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : imagePreview ? (
          /* Image Preview with AI Scanning Effect */
          <div className="relative w-full h-full">
            <img
              src={imagePreview}
              alt="Harvest Crop Specimen"
              className="w-full h-full object-cover"
            />
            {/* AI Scanning Laser Line */}
            {isScanning && (
              <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[1px]">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-scan"></div>
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-slate-900/80 border border-emerald-500/50 text-[10px] font-mono text-emerald-300 flex items-center gap-1.5 backdrop-blur-sm">
                  <Scan className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>ANALYZING GRAIN DEFECTS & MOISTURE</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-[11px] font-semibold text-emerald-400 backdrop-blur-sm flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Inspection Specimen Ready</span>
            </div>
          </div>
        ) : (
          /* Empty Placeholder */
          <div className="text-center p-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-xs text-slate-400 font-medium">
              No harvest photo attached
            </div>
            <div className="text-[10px] text-slate-500 max-w-xs mx-auto">
              Take a live photo or upload an image to grade moisture and fungal defects
            </div>
          </div>
        )}
      </div>

      {/* Controls: Live Camera OR Upload */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={startCamera}
          className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500/50 text-white text-xs font-semibold transition active:scale-95 shadow-sm"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>{t.imageCamera}</span>
        </button>

        <label className="flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-white text-xs font-semibold cursor-pointer transition active:scale-95 shadow-sm">
          <Upload className="w-4 h-4 text-slate-400" />
          <span className="truncate">{t.imageUpload}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Tip */}
      <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
        🌾 <strong className="text-slate-300">Tip:</strong> {t.imageHint}
      </div>
    </div>
  );
}
