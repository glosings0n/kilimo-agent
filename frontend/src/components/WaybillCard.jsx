import { Truck, QrCode, Printer, MapPin, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { translations } from '../utils/translations';

export default function WaybillCard({
  freightData,
  farmerId,
  commodity,
  volumeFormatted,
  lang
}) {
  const t = translations[lang] || translations.en;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {t.waybillTitle}
            </h3>
            <p className="text-xs text-slate-400">
              {t.waybillSub}
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95 shadow-sm"
        >
          <Printer className="w-4 h-4 text-purple-400" />
          <span>{t.btnPrintWaybill}</span>
        </button>
      </div>

      {/* Bill of Lading Ticket Voucher */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-purple-500/30 p-6 shadow-2xl overflow-hidden space-y-6">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Ticket Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">
              Official Freight Tracking ID
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-wider text-purple-300 mt-0.5">
              {freightData.waybillId || 'KILIMO-WB-63F15ADA'}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {freightData.status || 'DISPATCH_CONFIRMED'}
            </span>
          </div>
        </div>

        {/* Route Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Origin */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              {t.originHub}
            </div>
            <div className="text-sm font-bold text-white">
              Bunia Logistics Depot / Regional Aggregator
            </div>
            <div className="text-xs text-slate-400">
              Farmer / Co-op ID: <span className="font-mono text-slate-300">{farmerId || 'FARMER-UNBIASED'}</span>
            </div>
          </div>

          {/* Destination */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              {t.destinationHub}
            </div>
            <div className="text-sm font-bold text-emerald-400">
              {freightData.destination || 'Border Trade Zone Wholesale Terminal'}
            </div>
            <div className="text-xs text-slate-400">
              Commodity: <span className="text-slate-300">{commodity || 'Maize'} ({volumeFormatted || '1,500 KG'})</span>
            </div>
          </div>
        </div>

        {/* Key Dispatch Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {t.carrierFleet}
            </div>
            <div className="text-xs font-bold text-white mt-1 truncate">
              {freightData.carrier || 'East-West AgroLogistics'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {t.transitEta}
            </div>
            <div className="text-xs font-bold text-teal-400 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {freightData.transitEta || '6 Hours'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {t.freightDeduction}
            </div>
            <div className="text-xs font-bold text-rose-300 mt-1">
              {freightData.freightCostFormatted || `$${freightData.freightCost || 60}.00 USD`}
            </div>
          </div>
        </div>

        {/* Barcode & Security Ledger Footer */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
              <QrCode className="w-full h-full text-slate-900" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-400">
                VERIFIED CRYPTOGRAPHIC DISPATCH TOKEN
              </div>
              <div className="text-[9px] font-mono text-slate-500">
                AUTH-SHA256: 8F2A-44B9-C10E-9218
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Pre-authorized for Direct Carrier Loading</span>
          </div>
        </div>
      </div>
    </div>
  );
}
