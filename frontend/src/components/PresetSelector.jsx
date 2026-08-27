import { Sparkles, Check, Play } from 'lucide-react';
import { PRESET_SCENARIOS } from '../utils/presets';
import { translations } from '../utils/translations';

export default function PresetSelector({
  selectedPresetId,
  onSelectPreset,
  lang
}) {
  const t = translations[lang] || translations.en;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-wide">
            {t.presetsTitle}
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Click any scenario to pre-load voice notes & harvest photography
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESET_SCENARIOS.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`text-left p-3.5 rounded-2xl border transition-all duration-200 relative group ${
                isSelected
                  ? 'bg-gradient-to-br from-emerald-950/80 to-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/50'
                  : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-950/60 text-slate-300 border border-slate-700/60">
                  {preset.category}
                </span>
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-700/40 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition">
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </div>
                )}
              </div>

              <div className="mt-2.5">
                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                  {preset.title}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {preset.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
