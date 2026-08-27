import { Mic, Eye, Truck, Sparkles } from 'lucide-react';
import { translations } from '../utils/translations';

export default function HeroBanner({ lang }) {
  const t = translations[lang] || translations.en;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950 border border-slate-800 shadow-2xl p-6 sm:p-8 md:p-10 text-white">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl space-y-6">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-emerald-400 animate-spin-slow" />
          <span>Multimodal Agentic Solution for Smallholder Cooperatives</span>
        </div>

        {/* Hero Title */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
          {t.heroTitle}
        </h2>

        {/* Hero Description */}
        <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed font-normal">
          {t.heroDesc}
        </p>

        {/* 3 Core Multimodal Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Pillar 1 */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                {t.heroStat1}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Swahili / French Voice Dialects
              </div>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                Computer Vision
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Automated Grain Grading (A/B)
              </div>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                {t.heroStat3}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Direct Carrier Waybill Dispatch
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
