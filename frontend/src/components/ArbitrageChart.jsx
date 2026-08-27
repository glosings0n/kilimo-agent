import { TrendingUp, Award, ArrowUpRight } from 'lucide-react';
import { translations } from '../utils/translations';

export default function ArbitrageChart({
  arbitrageData,
  lang
}) {
  const t = translations[lang] || translations.en;
  if (!arbitrageData || !arbitrageData.hubs || arbitrageData.hubs.length === 0) {
    return null;
  }

  const hubs = arbitrageData.hubs;
  const maxNet = Math.max(...hubs.map(h => h.net || 0), 1);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {t.arbitrageHeader}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t.arbitrageSub}
          </p>
        </div>

        {/* Arbitrage Advantage Badge */}
        {arbitrageData.arbitrageAdvantage && (
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/40 text-right flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
              <ArrowUpRight className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                {t.arbitrageGain}
              </div>
              <div className="text-base font-black text-white">
                {arbitrageData.arbitrageAdvantage}{" "}
                <span className="text-xs text-emerald-400 font-semibold">({arbitrageData.arbitrageAdvantagePct})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Hub Comparison Bars */}
      <div className="space-y-4">
        {hubs.map((hub, index) => {
          const isSelected = hub.selected;
          const pct = Math.max(15, Math.min(100, Math.round((hub.net / maxNet) * 100)));

          return (
            <div
              key={index}
              className={`p-4 rounded-2xl border transition-all duration-300 relative ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-500/40'
                  : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2.5">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-bold shadow-md shadow-emerald-500/30">
                      <Award className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold">
                      #{index + 1}
                    </div>
                  )}
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    {hub.name}
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-extrabold tracking-wider">
                        {t.selectedBadge}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs font-semibold">
                  <div className="text-slate-400">
                    Spot: <span className="text-white">${hub.price.toFixed(2)}/kg</span>
                  </div>
                  <div className="text-slate-400">
                    Gross: <span className="text-white">${hub.gross.toFixed(2)}</span>
                  </div>
                  <div className="text-slate-400">
                    Freight: <span className="text-rose-400">-${hub.freight.toFixed(2)}</span>
                  </div>
                  <div className={`text-sm font-black ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>
                    Net: ${hub.net.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_#10b981]'
                      : 'bg-slate-700'
                  }`}
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formula Explanation */}
      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <span>
          🧮 <strong className="text-slate-300">Deterministic Arbitrage Formula:</strong> Net Payout = (Batch Volume × Spot Price) − Freight Cost
        </span>
        <span className="text-[11px] font-mono text-emerald-400">
          Zero Speculation
        </span>
      </div>
    </div>
  );
}
