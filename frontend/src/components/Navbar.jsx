import { useState } from 'react';
import { ShieldCheck, Cpu, Server, Info, Sparkles, Check, Database, Zap } from 'lucide-react';

export default function Navbar({
  lang,
  setLang,
  backendUrl,
  setBackendUrl,
  isSimulation,
  setIsSimulation,
  onOpenArch
}) {
  const [showConfig, setShowConfig] = useState(false);

  const handleModeChange = (mode) => {
    if (mode === 'simulation') {
      setIsSimulation(true);
    } else if (mode === 'cloudrun') {
      setIsSimulation(false);
      setBackendUrl('https://kilimo-backend-840262173056.us-central1.run.app');
    } else if (mode === 'localhost') {
      setIsSimulation(false);
      setBackendUrl('http://localhost:8080');
    }
    setShowConfig(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/20 bg-slate-900/95 backdrop-blur-md text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <span className="text-xl font-black tracking-tighter bg-gradient-to-br from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  KA
                </span>
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-ping opacity-75"></span>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                KilimoAgent
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Multimodal v2.0
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Autonomous Agricultural Arbitrage & Logistics Dispatch
            </p>
          </div>
        </div>

        {/* Foundation Models Badges */}
        <div className="hidden xl:flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gemini 3.6 Flash</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Gemma 2 (9B-IT)</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firestore State</span>
          </div>
        </div>

        {/* Action Controls & Settings */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Architecture Explainer */}
          <button
            onClick={onOpenArch}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95"
            title="System Architecture Diagram"
          >
            <Info className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Architecture</span>
          </button>

          {/* Engine Selector */}
          <div className="relative">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">
                {isSimulation ? "Demo Engine" : "Cloud Backend"}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            {showConfig && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Orchestration Backend
                </div>
                <div className="space-y-1 mt-1">
                  <button
                    onClick={() => handleModeChange('simulation')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                      isSimulation ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Gemini Demo Engine
                      </div>
                      <div className="text-[10px] text-slate-400">Zero-latency realistic multimodal simulation</div>
                    </div>
                    {isSimulation && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => handleModeChange('cloudrun')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                      !isSimulation && backendUrl.includes('run.app') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-blue-400" />
                        Google Cloud Run (Live)
                      </div>
                      <div className="text-[10px] text-slate-400">Production serverless endpoint</div>
                    </div>
                    {!isSimulation && backendUrl.includes('run.app') && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => handleModeChange('localhost')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                      !isSimulation && backendUrl.includes('localhost') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-purple-400" />
                        Localhost (Port 8080)
                      </div>
                      <div className="text-[10px] text-slate-400">Local FastAPI instance</div>
                    </div>
                    {!isSimulation && backendUrl.includes('localhost') && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                lang === 'en' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('fr')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                lang === 'fr' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => setLang('sw')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                lang === 'sw' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              SW
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
