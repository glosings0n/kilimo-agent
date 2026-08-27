import { Mic, Eye, Truck } from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';
import { translations } from '../utils/translations';

export default function HeroBanner({ lang }) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 shadow-xs p-6 sm:p-8 md:p-10">
      <div className="relative z-10 max-w-4xl space-y-5">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <GeminiIcon className="w-3.5 h-3.5" />
          <span>Multimodal Agentic Workflow for Agricultural Cooperatives</span>
        </div>

        {/* Hero Title */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {t.heroTitle}
        </h2>

        {/* Hero Description */}
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed font-normal">
          {t.heroDesc}
        </p>

        {/* 3 Core Multimodal Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
          {/* Pillar 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                {t.heroStat1}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Swahili / French Voice Dialects
              </div>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Computer Vision
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Automated Grain Grading (A/B)
              </div>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                {t.heroStat3}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Direct Carrier Waybill Dispatch
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
