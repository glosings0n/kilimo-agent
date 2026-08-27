import { useState } from 'react';
import {
  SquarePen,
  BookmarkCheck,
  Cpu,
  Layers,
  PanelLeftClose,
  PanelLeft,
  Settings,
  ChevronRight,
  Database,
  ShieldCheck,
  Zap,
  Globe,
  Navigation,
  FileCheck,
  MessageSquare
} from 'lucide-react';
import { UkFlag, FranceFlag, TanzaniaFlag } from './Flags';

export default function Sidebar({
  isExpanded,
  setIsExpanded,
  selectedPresetId,
  onSelectPreset,
  onNewDispatch,
  onOpenArch,
  lang,
  setLang
}) {
  const handlePresetClick = (preset) => {
    onSelectPreset(preset);
    if (window.innerWidth < 768) {
      setIsExpanded(false);
    }
  };

  const handleNewDispatchClick = () => {
    onNewDispatch();
    if (window.innerWidth < 768) {
      setIsExpanded(false);
    }
  };

  const handleOpenArchClick = () => {
    onOpenArch();
    if (window.innerWidth < 768) {
      setIsExpanded(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200 cursor-pointer"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#090D16] border-r border-slate-800/90 transition-all duration-300 ease-in-out flex flex-col justify-between select-none ${
          isExpanded
            ? 'translate-x-0 w-72 '
            : '-translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        {/* Top Header Section */}
        <div className={`h-16 flex items-center px-3.5 border-b border-slate-800/80 shrink-0 ${
          isExpanded ? 'justify-between' : 'justify-center'
        }`}>
          {/* Logo & Brand */}
          <div className="relative group flex items-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-3 text-left cursor-pointer"
            >
              <img
                src="/logo.png"
                alt="KilimoAgent"
                className="w-9 h-9 object-contain group-hover:scale-105 transition shrink-0"
              />
              {isExpanded && (
                <div className="min-w-0 flex items-center space-x-1.5 animate-in fade-in duration-200">
                  <span className="text-base font-extrabold tracking-tight text-white">
                    KilimoAgent
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Taskmaster
                  </span>
                </div>
              )}
            </button>

            {/* Custom Tooltip on hover when collapsed */}
            {!isExpanded && (
              <span className="absolute left-14 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition  pointer-events-none z-50">
                Open sidebar
              </span>
            )}
          </div>

          {/* Collapse Button */}
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Middle Section (Presets, New Dispatch, Languages) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 min-h-0">
            
            {/* New Dispatch Button */}
            <div className="relative group">
              <button
                onClick={handleNewDispatchClick}
                className={`w-full flex items-center rounded-2xl transition cursor-pointer ${
                  isExpanded
                    ? 'bg-slate-900 hover:bg-slate-800/90 text-white px-3.5 py-3 space-x-3 border border-slate-800 '
                    : 'justify-center p-3 text-slate-300 hover:bg-slate-900 hover:text-white rounded-xl'
                }`}
              >
                <SquarePen className="w-5 h-5 text-emerald-400 shrink-0" />
                {isExpanded && (
                  <span className="text-xs font-bold tracking-wide">
                    New Dispatch
                  </span>
                )}
              </button>

            {/* Custom Tooltip when collapsed */}
            {!isExpanded && (
              <span className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition  pointer-events-none z-50">
                New Dispatch
              </span>
            )}
          </div>

          {/* Active Cyber-Physical Agent Capabilities */}
          <div className="space-y-1.5 pt-1">
            {isExpanded ? (
              <div className="px-2 text-[11px] font-bold text-slate-400">
                {lang === 'sw' ? "Zana za Wakala" : lang === 'fr' ? "Outils de l'Agent" : "Agent Capabilities"}
              </div>
            ) : (
              <div className="relative group w-full flex justify-center py-1">
                <Cpu className="w-4 h-4 text-slate-400" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition  pointer-events-none z-50">
                  {lang === 'sw' ? "Zana za Wakala" : lang === 'fr' ? "Outils de l'Agent" : "Agent Capabilities"}
                </span>
              </div>
            )}

            <div className="space-y-1">
              {[
                { icon: <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />, title: lang === 'sw' ? "Rada ya Masoko" : lang === 'fr' ? "Radar des Marchés" : "Corridor Market Radar", desc: "Nakuru, Eldoret, Busia" },
                { icon: <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />, title: lang === 'sw' ? "Sheria za EAC" : lang === 'fr' ? "Réglementation EAC" : "EAC/COMESA RAG", desc: "Aflatoxin & SPS Standards" },
                { icon: <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />, title: lang === 'sw' ? "Tiketi ya Usafiri" : lang === 'fr' ? "Lettre de Voiture" : "SHA-256 Waybill", desc: "Carrier Dispatch Ledger" },
                { icon: <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />, title: lang === 'sw' ? "Passerelle WhatsApp" : lang === 'fr' ? "Passerelle WhatsApp" : "Twilio WhatsApp", desc: "Real-time SMS/Chat" },
              ].map((cap, idx) => (
                <div key={idx} className="relative group">
                  <div
                    className={`w-full flex items-center rounded-xl transition text-left ${
                      isExpanded
                        ? 'px-3 py-2 space-x-2.5 bg-slate-950/60 border border-slate-800/80 text-slate-300'
                        : 'justify-center p-2.5 text-slate-400'
                    }`}
                  >
                    {cap.icon}
                    {isExpanded && (
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {cap.title}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {cap.desc}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div className="pt-2 border-t border-slate-800/80">
            {isExpanded && (
              <div className="px-2 mb-2 text-[11px] font-bold text-slate-400">
                Language (Trilingual)
              </div>
            )}

            <div className={`flex items-center ${isExpanded ? 'space-x-1.5 px-1' : 'flex-col space-y-1.5'}`}>
              <div className="relative group w-full flex justify-center">
                <button
                  onClick={() => setLang('en')}
                  className={`rounded-lg transition cursor-pointer flex items-center justify-center ${
                    isExpanded ? 'px-2.5 py-1.5 space-x-1.5 w-full' : 'p-1.5'
                  } ${
                    lang === 'en' ? 'bg-emerald-500/25 border border-emerald-500/60 shadow-xs text-white' : 'opacity-40 hover:opacity-100 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  <UkFlag className="w-4 h-3 shrink-0" />
                  {isExpanded && <span className="text-xs font-bold">EN</span>}
                </button>
                {!isExpanded && (
                  <span className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition  pointer-events-none z-50">
                    English (EN)
                  </span>
                )}
              </div>

              <div className="relative group w-full flex justify-center">
                <button
                  onClick={() => setLang('fr')}
                  className={`rounded-lg transition cursor-pointer flex items-center justify-center ${
                    isExpanded ? 'px-2.5 py-1.5 space-x-1.5 w-full' : 'p-1.5'
                  } ${
                    lang === 'fr' ? 'bg-emerald-500/25 border border-emerald-500/60 shadow-xs text-white' : 'opacity-40 hover:opacity-100 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  <FranceFlag className="w-4 h-3 shrink-0" />
                  {isExpanded && <span className="text-xs font-bold">FR</span>}
                </button>
                {!isExpanded && (
                  <span className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition  pointer-events-none z-50">
                    Français (FR)
                  </span>
                )}
              </div>

              <div className="relative group w-full flex justify-center">
                <button
                  onClick={() => setLang('sw')}
                  className={`rounded-lg transition cursor-pointer flex items-center justify-center ${
                    isExpanded ? 'px-2.5 py-1.5 space-x-1.5 w-full' : 'p-1.5'
                  } ${
                    lang === 'sw' ? 'bg-emerald-500/25 border border-emerald-500/60 shadow-xs text-white' : 'opacity-40 hover:opacity-100 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  <TanzaniaFlag className="w-4 h-3 shrink-0" />
                  {isExpanded && <span className="text-xs font-bold">SW</span>}
                </button>
                {!isExpanded && (
                  <span className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition  pointer-events-none z-50">
                    Kiswahili (SW)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Engineering Pipeline & Architecture Trigger */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/90 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="relative group">
          <button
            onClick={handleOpenArchClick}
            className={`w-full flex items-center rounded-xl transition cursor-pointer ${
              isExpanded
                ? 'bg-emerald-950/30 hover:bg-emerald-950/60 text-emerald-300 p-2.5 space-x-3 border border-emerald-500/30'
                : 'justify-center p-2.5 text-emerald-400 hover:bg-slate-900 rounded-xl'
            }`}
          >
            <Cpu className="w-5 h-5 shrink-0 text-emerald-400" />
            {isExpanded && (
              <div className="text-left min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  Engineering Pipeline
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  5-Layer Architecture
                </div>
              </div>
            )}
          </button>

          {/* Custom Tooltip when collapsed */}
          {!isExpanded && (
            <span className="absolute left-14 bottom-0 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition  pointer-events-none z-50">
              Engineering Pipeline
            </span>
          )}
        </div>
      </div>
    </aside>
  </>
);
}