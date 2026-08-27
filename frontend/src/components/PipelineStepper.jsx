import { ShieldCheck, Mic, Eye, TrendingUp, Truck, Database, Check, Loader2, Sparkles } from 'lucide-react';
import { translations } from '../utils/translations';

export default function PipelineStepper({
  activeStep,
  isExecuting,
  lang
}) {
  const t = translations[lang] || translations.en;

  const steps = [
    {
      id: 1,
      title: t.step1Title,
      desc: t.step1Desc,
      icon: ShieldCheck,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30"
    },
    {
      id: 2,
      title: t.step2Title,
      desc: t.step2Desc,
      icon: Mic,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30"
    },
    {
      id: 3,
      title: t.step3Title,
      desc: t.step3Desc,
      icon: Eye,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30"
    },
    {
      id: 4,
      title: t.step4Title,
      desc: t.step4Desc,
      icon: TrendingUp,
      color: "text-teal-400",
      bg: "bg-teal-500/10",
      border: "border-teal-500/30"
    },
    {
      id: 5,
      title: t.step5Title,
      desc: t.step5Desc,
      icon: Truck,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30"
    },
    {
      id: 6,
      title: t.step6Title,
      desc: t.step6Desc,
      icon: Database,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30"
    }
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {t.pipelineTitle}
            </h3>
            <p className="text-[11px] text-slate-400">
              Autonomous dual-model security & reasoning chain
            </p>
          </div>
        </div>
        {isExecuting && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Autonomous Pipeline Running</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map((step) => {
          const Icon = step.icon;
          const isDone = activeStep > step.id;
          const isCurrent = activeStep === step.id && isExecuting;

          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-start space-x-3 relative overflow-hidden ${
                isCurrent
                  ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                  : isDone
                  ? 'bg-slate-800/40 border-slate-700/60'
                  : 'bg-slate-900/40 border-slate-800 opacity-60'
              }`}
            >
              {/* Status Indicator / Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isDone
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : isCurrent
                    ? `${step.bg} ${step.border} ${step.color} animate-pulse`
                    : `${step.bg} ${step.border} ${step.color}`
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Text info */}
              <div className="min-w-0">
                <div className={`text-xs font-bold truncate ${isCurrent ? 'text-emerald-300' : 'text-white'}`}>
                  {step.title}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
