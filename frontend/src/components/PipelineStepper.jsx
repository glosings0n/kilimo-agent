import { useState } from 'react';
import {
  ShieldCheck,
  Mic,
  Eye,
  TrendingUp,
  Truck,
  Database,
  Check,
  Loader2,
  Cpu,
  Layers,
  ArrowRight,
  Server,
  Activity,
  Terminal,
  Lock,
  ChevronRight
} from 'lucide-react';
import { GeminiIcon } from './GeminiIcon';
import { translations } from '../utils/translations';
import MODELS_CONFIG from '../config/models';

export default function PipelineStepper({
  activeStep = 6,
  isExecuting = false,
  lang = 'en',
  parsedData
}) {
  const [selectedNodeId, setSelectedNodeId] = useState(1);
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;

  const nodes = [
    {
      id: 1,
      name: "1. Multimodal Field Ingestion",
      short: "Field Ingestion",
      tech: "FastAPI / HTTP Multipart / Webhooks",
      badge: "Ingestion Layer",
      icon: Layers,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      summary: "Captures raw natural voice recordings in Swahili/French alongside uncompressed harvest photos directly from farm depots.",
      inputs: [
        "Farmer Audio Payload: Swahili / French acoustic stream",
        "Visual Harvest Photo: JPEG / PNG raw field capture",
        "Depot Origin: Bunia Depot / Regional Aggregation Center"
      ],
      outputs: [
        "Binary Multipart Stream validated with MIME integrity",
        "Decoupled audio buffer & raw camera bitmap buffers",
        "Unique transaction session ID generated"
      ],
      telemetry: {
        latency: "18ms",
        throughput: "Zero-loss buffering",
        security: "TLS 1.3 End-to-End"
      }
    },
    {
      id: 2,
      name: "2. Gemma 2 Security Armor",
      short: "Gemma 2 Armor",
      tech: "Gemma-2-9b-it / Cloud Run",
      badge: "Security Guardrail",
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      summary: "Performs pre-execution security audits, scanning for prompt injections, system leakage, and malicious instructions before the payload reaches the reasoning engine.",
      inputs: [
        "Unsanitized field voice transcripts & text metadata",
        "Cooperative user credentials & phone tokens"
      ],
      outputs: [
        "Verdict: SAFE (0.00 prompt injection probability)",
        "PII Sanitization: Farmer phone numbers tokenized",
        "Tool Argument Protection: Confirmed valid payload"
      ],
      telemetry: {
        model: "gemma-2-9b-it",
        latency: "42ms",
        verdict: "0.00 Injection Risk"
      }
    },
    {
      id: 3,
      name: "3. Gemini 3.6 Multimodal Core",
      short: "Gemini Core",
      tech: "Gemini 3.6 Flash / Zero-Temp AFC",
      badge: "Multimodal AI",
      icon: Eye,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      summary: "Performs simultaneous Swahili dialect acoustic transcription and computer vision grading (kernel health, husk dryness, Grade A/B quality).",
      inputs: [
        "Acoustic Audio: " + (parsedData?.audio?.spokenExcerpt || "Verified spoken excerpt in Kiswahili dialect"),
        "Crop Specimen Photo: Harvest batch high-resolution imagery"
      ],
      outputs: [
        "Extracted Volume: " + (parsedData?.audio?.weightFormatted || "1,500 KG verified weight"),
        "Identified Specimen: " + (parsedData?.visual?.specimen || "Yellow Maize (Zea mays indentata)"),
        "Quality Grade: " + (parsedData?.visual?.qualityGrade || "Grade A Standard (~12.2% moisture)")
      ],
      telemetry: {
        model: MODELS_CONFIG.defaultModelId,
        temperature: "0.0 (Deterministic)",
        visionTokens: "258 tokens"
      }
    },
    {
      id: 4,
      name: "4. Market Arbitrage Engine",
      short: "Arbitrage Tool",
      tech: "Haversine Distance Matrix / Real-time Spot Feed",
      badge: "Autonomous Tool 1",
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      summary: "Evaluates wholesale spot prices across 14 regional trade hubs, subtracting road freight costs and border transit delays to compute maximum net profit.",
      inputs: [
        "Origin: Bunia Logistics Depot (Ituri Corridor)",
        "Verified Commodity: Maize (1,500 KG)",
        "Spot Prices: 14 East-Central African wholesale markets"
      ],
      outputs: [
        "Optimal Hub: " + (parsedData?.arbitrage?.optimalHub || "Border Trade Zone Terminal ($0.45/kg)"),
        "Net Farmer Payout: " + (parsedData?.arbitrage?.netPayoutFormatted || "$615.00 USD (1,722,000 CDF)"),
        "Arbitrage Advantage: +$105.00 USD extra revenue vs Central Depot"
      ],
      telemetry: {
        toolName: "fetch_realtime_market_arbitrage",
        execution: "Synchronous Haversine",
        currencyRates: "USD, CDF, KES, UGX, RWF, TZS"
      }
    },
    {
      id: 5,
      name: "5. Carrier Freight Dispatch",
      short: "Freight Dispatch",
      tech: "Automated Capacity Lock / Cryptographic SHA-256",
      badge: "Autonomous Tool 2",
      icon: Truck,
      color: "text-teal-400",
      bg: "bg-teal-500/10",
      border: "border-teal-500/30",
      summary: "Dispatches freight carriers, locks road transit capacity, and generates verifiable, collision-resistant electronic bills of lading.",
      inputs: [
        "Optimal Route: Bunia -> Border Wholesale Terminal",
        "Freight Deduction: $60.00 USD ($0.04/kg)",
        "Consignment Weight: 1,500 KG"
      ],
      outputs: [
        "Assigned Carrier: East-West AgroLogistics Fleet",
        "Waybill ID: " + (parsedData?.freight?.waybillId || "KILIMO-WB-63F15ADA"),
        "Transit ETA: 6 Hours (Border clearance pre-certified)"
      ],
      telemetry: {
        toolName: "generate_carrier_waybill",
        signature: "SHA256: e8b93f15ad...7c",
        status: "DISPATCH_CONFIRMED"
      }
    },
    {
      id: 6,
      name: "6. Firestore State Machine",
      short: "Firestore State",
      tech: "Google Cloud Firestore Native",
      badge: "State & Audit Trace",
      icon: Database,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      summary: "Records the immutable transaction lifecycle and cryptographic audit trace on Google Cloud for cooperative oversight and farmer trust.",
      inputs: [
        "Full structured execution report JSON",
        "Transaction ID: " + (parsedData?.txId || "TX-KILIMO-884920F"),
        "Farmer Co-op ID"
      ],
      outputs: [
        "Lifecycle State: INITIALIZED -> AUDITED -> COMPLETED",
        "Firestore Document: `/dispatches/${txId}` saved",
        "Webhooks / WhatsApp delivery completed"
      ],
      telemetry: {
        persistence: "Cloud Firestore Multi-Region",
        consistency: "Strong Global Consistency",
        state: "COMPLETED"
      }
    }
  ];

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];
  const SelectedIcon = selectedNode.icon;

  return (
    <div className="bg-[#0F172A]/90 border border-slate-800/90 rounded-3xl p-6  space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Live Telemetry HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              Autonomous Execution Architecture
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                Interactive Flow
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Click any node in the topology below to inspect real-time inputs, outputs, and security telemetry
            </p>
          </div>
        </div>

        {/* Global Pipeline Health Status */}
        <div className="flex items-center gap-2">
          {isExecuting ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Pipeline running...</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Pipeline state: Completed</span>
            </span>
          )}
        </div>
      </div>

      {/* Interactive Topology Grid (6 Nodes with Connecting Flow) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
          <span>End-to-end pipeline nodes</span>
          <span className="text-[11px] text-emerald-400">Click a node to inspect payload</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {nodes.map((node) => {
            const Icon = node.icon;
            const isSelected = selectedNodeId === node.id;
            const isCompleted = activeStep >= node.id;
            const isCurrent = activeStep === node.id && isExecuting;

            return (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`text-left p-4 rounded-2xl border transition-all duration-150 relative group cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-2 border-emerald-500'
                    : isCompleted
                    ? 'bg-slate-950 hover:bg-slate-900 border-slate-800'
                    : 'bg-slate-950 border-slate-900 opacity-60'
                }`}
              >
                {/* Node Status Badge & ID */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${node.bg} ${node.color} border ${node.border}`}>
                    {node.badge}
                  </span>
                  
                  <div className="flex items-center space-x-1.5">
                    {isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    ) : isCompleted ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                    )}
                  </div>
                </div>

                {/* Node Header */}
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 '
                      : `${node.bg} ${node.border} ${node.color}`
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                      {node.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {node.tech}
                    </div>
                  </div>
                </div>

                {/* Selection indicator pill */}
                {isSelected && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-extrabold shadow-xs">
                    Viewing
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Node Deep-Dive Inspector Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-5 animate-in fade-in duration-200">
        
        {/* Inspector Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${selectedNode.bg} ${selectedNode.border} ${selectedNode.color}`}>
              <SelectedIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-extrabold text-white">
                  {selectedNode.name}
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
                  {selectedNode.tech}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedNode.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Node ID: 0{selectedNode.id} / 06</span>
          </div>
        </div>

        {/* Dual Column: Inputs vs Outputs Payload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Inputs Column */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                Input arguments & ingestion
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                Raw input
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
              {selectedNode.inputs.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 leading-relaxed">
                  <span className="text-amber-400 font-bold shrink-0">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Outputs Column */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <GeminiIcon className="w-3.5 h-3.5" />
                Output result & extracted state
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                Verified state
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-200 font-mono">
              {selectedNode.outputs.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 leading-relaxed">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400">
            {Object.entries(selectedNode.telemetry).map(([key, val], idx) => (
              <div key={idx} className="flex items-center space-x-1.5">
                <span className="text-slate-500">{key}:</span>
                <span className="text-emerald-400 font-bold">{val}</span>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Cloud Run enterprise managed execution</span>
          </div>
        </div>
      </div>
    </div>
  );
}
