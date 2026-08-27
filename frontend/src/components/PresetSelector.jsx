import { Play, Check, X, BookmarkCheck } from 'lucide-react';
import { PRESET_SCENARIOS } from '../utils/presets';
import { translations } from '../utils/translations';

export default function RightSidebar({
  isOpen,
  onClose,
  selectedPresetId,
  onSelectPreset,
  lang = 'en'
}) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0F172A] border-l border-slate-800  flex flex-col justify-between overflow-y-auto custom-scrollbar p-6 space-y-6 text-slate-100 animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <BookmarkCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Demo Scenarios
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Pre-load multimodal voice notes & crop photos
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scenario Cards List */}
          <div className="space-y-3 flex-1">
            <div className="space-y-2.5">
              {PRESET_SCENARIOS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition relative group cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 ring-1'
                        : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {preset.category}
                      </span>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 opacity-60 group-hover:opacity-100 transition">
                          <Play className="w-2.5 h-2.5 fill-current" />
                        </div>
                      )}
                    </div>

                    <div className="mt-2">
                      <div className={`text-xs font-bold ${
                        isSelected ? 'text-emerald-300' : 'text-white group-hover:text-emerald-400'
                      }`}>
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

          {/* Footer Note */}
          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Clicking a scenario automatically loads voice recordings and field photography.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
