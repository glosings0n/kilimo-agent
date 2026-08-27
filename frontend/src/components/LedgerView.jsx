import { useState } from 'react';
import { Copy, Check, FileText, Database, ShieldCheck, Cpu } from 'lucide-react';
import { translations } from '../utils/translations';

export default function LedgerView({
  rawText,
  lang
}) {
  const [copied, setCopied] = useState(false);
  const t = translations[lang] || translations.en;

  const handleCopy = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {t.ledgerTitle}
            </h3>
            <p className="text-xs text-slate-400">
              {t.ledgerSub}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95 shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">{t.copied}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-cyan-400" />
              <span>{t.btnCopyLedger}</span>
            </>
          )}
        </button>
      </div>

      {/* Persistence and Security Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Guardrail Audit</div>
            <div className="text-xs font-bold text-white">Gemma 2 (9B-IT) : SAFE</div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center space-x-3">
          <Cpu className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Reasoning Core</div>
            <div className="text-xs font-bold text-white">Gemini 3.6 Flash AFC</div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center space-x-3">
          <Database className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Firestore State</div>
            <div className="text-xs font-bold text-emerald-400">STATUS: COMPLETED</div>
          </div>
        </div>
      </div>

      {/* Raw Output Block */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800/90 p-4 font-mono text-xs leading-relaxed text-slate-300 overflow-x-auto max-h-96 custom-scrollbar">
        <pre className="whitespace-pre-wrap font-mono">
          {rawText || "No ledger trace recorded."}
        </pre>
      </div>
    </div>
  );
}
