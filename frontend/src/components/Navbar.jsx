import { BookmarkCheck, Cpu } from 'lucide-react';
import { UkFlag, FranceFlag, KenyaFlag } from './Flags';

export default function Navbar({
  lang,
  setLang,
  isSidebarOpen,
  setIsSidebarOpen,
  onOpenArch
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#090D16]/90 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="KilimoAgent Logo"
            className="w-9 h-9 object-contain"
          />
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              KilimoAgent
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Taskmaster
              </span>
            </span>
          </div>
        </div>

        {/* Right: Language Selector & Menu Buttons */}
        <div className="flex items-center space-x-2.5">
          {/* Language Selector (Crisp SVG Flags Only) */}
          <div className="flex items-center bg-slate-900/90 rounded-xl p-1 border border-slate-800 mr-1 space-x-1">
            <button
              onClick={() => setLang('en')}
              title="English"
              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                lang === 'en'
                  ? 'bg-emerald-500/25 border border-emerald-500/60 shadow-xs'
                  : 'opacity-40 hover:opacity-100 hover:bg-slate-800'
              }`}
            >
              <UkFlag className="w-5 h-3.5" />
            </button>
            <button
              onClick={() => setLang('fr')}
              title="Français"
              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                lang === 'fr'
                  ? 'bg-emerald-500/25 border border-emerald-500/60 shadow-xs'
                  : 'opacity-40 hover:opacity-100 hover:bg-slate-800'
              }`}
            >
              <FranceFlag className="w-5 h-3.5" />
            </button>
            <button
              onClick={() => setLang('sw')}
              title="Kiswahili"
              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                lang === 'sw'
                  ? 'bg-emerald-500/25 border border-emerald-500/60 shadow-xs'
                  : 'opacity-40 hover:opacity-100 hover:bg-slate-800'
              }`}
            >
              <KenyaFlag className="w-5 h-3.5" />
            </button>
          </div>

          {/* Menu 1: Scenarios Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition cursor-pointer shadow-xs"
            title="Open Demo Scenarios Menu"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Scenarios</span>
          </button>

          {/* Menu 2: Engineering Pipeline Button */}
          <button
            onClick={onOpenArch}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-xs font-bold text-emerald-300 transition cursor-pointer shadow-xs"
            title="Open Engineering Pipeline & Architecture"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Engineering Pipeline</span>
          </button>
        </div>
      </div>
    </header>
  );
}
