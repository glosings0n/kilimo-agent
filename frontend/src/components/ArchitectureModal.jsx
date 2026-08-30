import { translations } from '../utils/translations';
import { X, ShieldCheck, Database, ArrowDown, Server, Cpu, Zap, Check } from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';

export default function ArchitectureModal({
  isOpen,
  onClose,
  backendUrl,
  setBackendUrl
}) {
  if (!isOpen) return null;

  const handleModeChange = (mode) => {
    if (mode === 'cloudrun') {
      setBackendUrl('https://kilimo-backend-840262173056.us-central1.run.app');
    } else if (mode === 'localhost') {
      setBackendUrl('http://localhost:8080');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in">
      {/* Outer clipped container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0F172A] border border-slate-800 rounded-3xl  overflow-hidden flex flex-col text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer "
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Inner Content */}
        <div className="overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6 flex-1">
          
          {/* Modal Header */}
          <div className="space-y-1 pr-10">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              KilimoAgent system engineering flow
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Autonomous dual-model security, reasoning chain, and serverless runtime configuration
            </p>
          </div>

          {/* Section: Live Execution Runtime Switcher */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                Active live backend runtime engine
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                100% Real Google ADK Pipeline
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleModeChange('cloudrun')}
                className={`text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                  backendUrl?.includes('run.app')
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-white">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    Google Cloud Run (Production)
                  </span>
                  {backendUrl?.includes('run.app') && (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  https://kilimo-backend-840262173056.us-central1.run.app
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('localhost')}
                className={`text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                  backendUrl?.includes('localhost')
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-white">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    Localhost Server (Port 8080)
                  </span>
                  {backendUrl?.includes('localhost') && (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  http://localhost:8080/api/v1/dispatch
                </div>
              </button>
            </div>
          </div>

          {/* Architecture Grid */}
          <div className="space-y-4 pt-1">
            {/* Layer 1: Ingestion */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">
                  1. Multimodal field ingestion layer
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                  FastAPI / Multipart HTTP
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The farmer or cooperative uploads a natural voice note in native Swahili or French alongside a raw harvest photo. No text typing or manual data entry required.
              </p>
            </div>

            <div className="flex justify-center text-slate-600">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Layer 2: Gemma 2 Guardrail */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  2. Security & guardrail armor (Gemma 2 9B-IT)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                  Gemma-2-9b-it
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Performs pre-execution security audits, scanning for prompt injections, system leakage, and malicious instructions before the payload reaches the reasoning engine.
              </p>
            </div>

            <div className="flex justify-center text-slate-600">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Layer 3: Gemini 3.6 Flash Orchestrator */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <GeminiIcon className="w-4 h-4" />
                  3. Primary multimodal orchestrator (Gemini 3.6 Flash)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                  Zero Temperature / AFC
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Performs Swahili acoustic transcription (verbatim quote, exact weight in kilograms, origin depot) and Computer Vision quality inspection (kernel integrity, moisture level, Grade A/B classification).
              </p>
            </div>

            <div className="flex justify-center text-slate-600">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Layer 4: Autonomous Tool Calling & Execution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Tool 1: Market arbitrage engine
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Calls <code className="text-emerald-400 font-bold">fetch_realtime_market_arbitrage()</code> to calculate real haversine road distances and multi-currency payouts across 14 trade hubs.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Tool 2: Logistics dispatch service
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Calls <code className="text-emerald-400 font-bold">generate_carrier_waybill()</code> to lock carrier capacity with SHA-256 digital stamps and collision-resistant waybills.
                </p>
              </div>
            </div>

            <div className="flex justify-center text-slate-600">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Layer 5: State Machine & Google Cloud Infrastructure */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="w-6 h-6 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">{t.googleCloudFirestoreAudit}</div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Immutable state lifecycle: Initialized → Guardrail Audited → Running Pipeline → Completed
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                Cloud Run Native
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-xs cursor-pointer"
            >
              Close engineering view
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

