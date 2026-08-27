import GeminiIcon from './GeminiIcon';

export default function ResponseShimmerSkeleton({ lang = 'en' }) {
  const getThinkingText = () => {
    if (lang === 'fr') return "KilimoAgent analyse votre requête & calcule l'arbitrage...";
    if (lang === 'sw') return "KilimoAgent inachambua mazao yako na kuhesabu soko bora...";
    return "KilimoAgent is analyzing harvest data & computing market arbitrage in real time...";
  };

  const getSubText = () => {
    if (lang === 'fr') return "Gemini 3.6 Flash • Gemma 2 Guardrail • Haversine Freight Engine";
    if (lang === 'sw') return "Gemini 3.6 Flash • Gemma 2 Guardrail • Injini ya Usafirishaji";
    return "Gemini 3.6 Flash • Gemma 2 Guardrail • Haversine Freight Engine";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      
      {/* Reasoning Status Indicator with glowing Gemini Star */}
      <div className="rounded-2xl bg-[#0F172A]/90 border border-slate-800 p-4  flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
              <GeminiIcon className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          </div>
          <div>
            <div className="text-sm font-extrabold text-white flex items-center space-x-2">
              <span>{getThinkingText()}</span>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {getSubText()}
            </div>
          </div>
        </div>

        {/* Pulsing Dots */}
        <div className="flex items-center space-x-1.5 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>

      {/* Hero KPI Summary Shimmer Box */}
      <div className="rounded-3xl bg-[#0F172A] border border-slate-800 p-6  space-y-5 relative overflow-hidden">
        {/* Top bar placeholder */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-28 rounded-full animate-shimmer"></div>
              <div className="h-4 w-24 rounded-md animate-shimmer"></div>
            </div>
            <div className="h-7 w-64 rounded-lg animate-shimmer"></div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-9 w-24 rounded-xl animate-shimmer"></div>
            <div className="h-9 w-32 rounded-xl animate-shimmer"></div>
          </div>
        </div>

        {/* 4 Shimmer KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="h-3 w-16 rounded animate-shimmer"></div>
              <div className="h-7 w-28 rounded animate-shimmer"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation Shimmer Bar */}
      <div className="flex items-center space-x-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-28 rounded-xl animate-shimmer"></div>
        ))}
      </div>

      {/* Main Content Area Shimmer */}
      <div className="rounded-3xl bg-[#0F172A] border border-slate-800 p-6  space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded animate-shimmer"></div>
          <div className="h-5 w-32 rounded animate-shimmer"></div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="h-20 w-full rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 space-y-2">
            <div className="h-4 w-3/4 rounded animate-shimmer"></div>
            <div className="h-3 w-1/2 rounded animate-shimmer"></div>
          </div>
          <div className="h-28 w-full rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 space-y-3">
            <div className="h-4 w-2/3 rounded animate-shimmer"></div>
            <div className="h-3 w-5/6 rounded animate-shimmer"></div>
            <div className="h-3 w-1/3 rounded animate-shimmer"></div>
          </div>
        </div>
      </div>

    </div>
  );
}
