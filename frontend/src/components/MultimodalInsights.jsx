import { Mic, Eye, CheckCircle2, MapPin, Scale, Sparkles } from 'lucide-react';
import { translations } from '../utils/translations';

export default function MultimodalInsights({
  audioData,
  visualData,
  lang
}) {
  const t = translations[lang] || translations.en;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Audio Perception Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Mic className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {t.audioCardTitle}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t.audioCardSub}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
            Ground Truth
          </span>
        </div>

        {/* Verbatim Spoken Excerpt */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {t.spokenQuote}
          </div>
          <p className="text-xs font-serif italic text-amber-200/90 leading-relaxed">
            "{audioData.transcript || 'Spoken excerpt transcribed by Gemini'}"
          </p>
        </div>

        {/* Extracted Entity Badges */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Scale className="w-3 h-3 text-amber-400" />
              {t.extractedVolume}
            </div>
            <div className="text-sm font-black text-white mt-1">
              {audioData.weightFormatted || `${audioData.weight} KG`}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-teal-400" />
              {t.extractedOrigin}
            </div>
            <div className="text-sm font-black text-white mt-1 truncate">
              {audioData.origin || 'Regional Depot'}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.detectedDialect} <strong className="text-slate-200">{audioData.dialect || 'Swahili'}</strong></span>
        </div>
      </div>

      {/* Visual Crop Inspection Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Eye className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {t.visionCardTitle}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t.visionCardSub}
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {visualData.qualityGrade || 'Grade A'}
          </span>
        </div>

        {/* Identified Specimen & Integrity */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.identifiedSpecimen}
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {visualData.specimen || 'Maize Specimen'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {visualData.characteristics || 'Intact kernel rows, fully dried husks, zero pest infestation detected.'}
          </p>
        </div>

        {/* Inspection Parameters */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {t.moistureRating}
            </div>
            <div className="text-sm font-black text-emerald-400 mt-1">
              {visualData.moisture || '12.2% (Optimal)'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {t.infestationRating}
            </div>
            <div className="text-sm font-black text-teal-400 mt-1">
              {visualData.pestInfestation || '0.0% (Clean)'}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Quality Standard Certified for Regional Export</span>
        </div>
      </div>
    </div>
  );
}
