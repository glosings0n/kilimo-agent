import { X, ShieldCheck, Sparkles, Database, ArrowDown } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-white custom-scrollbar space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Cloud Run & Gemini Enterprise Architecture</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            KilimoAgent System Engineering Flow
          </h2>
          <p className="text-xs text-slate-400">
            End-to-end autonomous multimodal arbitrage and dispatch execution pipeline
          </p>
        </div>

        {/* Architecture Grid */}
        <div className="space-y-4 pt-2">
          {/* Layer 1: Ingestion */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                1. Multimodal Field Ingestion Layer
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                FastAPI / Multipart HTTP
              </span>
            </div>
            <p className="text-xs text-slate-300">
              The farmer or cooperative uploads a natural voice note in native Swahili or French alongside a raw harvest photo. No text typing or manual data entry required.
            </p>
          </div>

          <div className="flex justify-center text-slate-500">
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </div>

          {/* Layer 2: Gemma 2 Guardrail */}
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                2. Security & Guardrail Armor (Gemma 2 9B-IT)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                Gemma-2-9b-it
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Performs pre-execution security audits, scanning for prompt injections, system leakage, and malicious instructions before the payload reaches the reasoning engine. Writes state <code className="text-blue-300">GUARDRAIL_AUDITED</code> to Firestore.
            </p>
          </div>

          <div className="flex justify-center text-slate-500">
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </div>

          {/* Layer 3: Gemini 3.6 Flash Orchestrator */}
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                3. Primary Multimodal Orchestrator (Gemini 3.6 Flash)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Zero Temperature / AFC
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Performs Swahili acoustic transcription (verbatim quote, exact weight in kilograms, origin depot) and Computer Vision quality inspection (kernel integrity, moisture level, Grade A/B classification).
            </p>
          </div>

          <div className="flex justify-center text-slate-500">
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </div>

          {/* Layer 4: Autonomous Tool Calling & Execution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-teal-500/40 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                Tool 1: Market Arbitrage Engine
              </div>
              <p className="text-xs text-slate-300">
                Calls <code className="text-teal-300">fetch_market_rates()</code> to evaluate wholesale spot market pricing across regional trading hubs and identifies the route with maximum Net Revenue.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-500/40 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                Tool 2: Logistics Dispatch Service
              </div>
              <p className="text-xs text-slate-300">
                Calls <code className="text-purple-300">dispatch_freight_booking()</code> to lock carrier capacity with verified freight partners and issues an electronic Waybill ID.
              </p>
            </div>
          </div>

          <div className="flex justify-center text-slate-500">
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </div>

          {/* Layer 5: State Machine & Google Cloud Infrastructure */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="w-6 h-6 text-cyan-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Google Cloud Firestore Audit Trail</div>
                <div className="text-[11px] text-slate-400">
                  Immutable state lifecycle: INITIALIZED → GUARDRAIL_AUDITED → RUNNING_PIPELINE → COMPLETED
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
              Cloud Run Native
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
          >
            Close Architecture View
          </button>
        </div>
      </div>
    </div>
  );
}
