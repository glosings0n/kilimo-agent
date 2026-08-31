import { useState, useEffect } from 'react';
import {
  X,
  History,
  Mail,
  User,
  ArrowRight,
  FileText,
  TrendingUp,
  Truck,
  CheckCircle2,
  Calendar,
  LogOut,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import GeminiIcon from './GeminiIcon';

export default function FarmerHistoryModal({
  isOpen,
  onClose,
  backendUrl,
  farmerAccount,
  setFarmerAccount,
  onLoadDispatch,
  onExportWaybill,
  lang = 'en'
}) {
  const [emailInput, setEmailInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [historyList, setHistoryList] = useState([]);

  const isFr = lang === 'fr';
  const isSw = lang === 'sw';

  // Load history whenever modal opens and farmerAccount has an email
  useEffect(() => {
    if (isOpen && farmerAccount?.email) {
      fetchFarmerHistory(farmerAccount.email);
    }
  }, [isOpen, farmerAccount]);

  const getEffectiveBackend = () => {
    if (backendUrl && backendUrl.length > 0) return backendUrl;
    if (typeof window !== 'undefined' && window.location.hostname.includes('run.app')) {
      return 'https://kilimo-backend-840262173056.us-central1.run.app';
    }
    return 'http://localhost:8000';
  };

  const fetchFarmerHistory = async (email) => {
    if (!email) return;
    setIsLoading(true);
    setError(null);
    try {
      const backend = getEffectiveBackend();
      const res = await fetch(`${backend}/api/v1/farmer/history?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.history || []);
      } else {
        throw new Error("Failed to fetch history");
      }
    } catch (err) {
      console.warn("[Fetch Farmer History Fallback]:", err);
      // Fallback: check localStorage cached dispatches
      try {
        const local = localStorage.getItem(`kilimo_history_${email}`);
        if (local) {
          setHistoryList(JSON.parse(local));
        }
      } catch (e) {}
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectEmail = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(isFr ? "Veuillez entrer une adresse email valide." : isSw ? "Tafadhali weka barua pepe sahihi." : "Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const backend = getEffectiveBackend();
      const res = await fetch(`${backend}/api/v1/farmer/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      if (res.ok) {
        const data = await res.json();
        const newAccount = {
          email: data.email,
          farmerId: data.farmer_id,
          name: data.name
        };
        setFarmerAccount(newAccount);
        localStorage.setItem('kilimo_farmer_email', data.email);
        localStorage.setItem('kilimo_farmer_id', data.farmer_id);
        setHistoryList(data.history || []);
        setEmailInput('');
        setSuccessMsg(
          data.is_new
            ? (isFr ? `Compte créé avec succès ! ID attribué : ${data.farmer_id}` : isSw ? `Akaunti imeundwa! Nambari ya Mkulima: ${data.farmer_id}` : `Account created! Assigned Farmer ID: ${data.farmer_id}`)
            : (isFr ? `Compte retrouvé ! Historique synchronisé.` : isSw ? `Akaunti imepatikana! Historia imesawazishwa.` : `Account connected! History synchronized.`)
        );
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        throw new Error("Could not connect farmer profile");
      }
    } catch (err) {
      console.warn("[Farmer Profile Connect Fallback]:", err);
      // Local fallback profile
      const localId = `KM-FARMER-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const newAccount = {
        email: cleanEmail,
        farmerId: localId,
        name: cleanEmail.split('@')[0]
      };
      setFarmerAccount(newAccount);
      localStorage.setItem('kilimo_farmer_email', cleanEmail);
      localStorage.setItem('kilimo_farmer_id', localId);
      setSuccessMsg(isFr ? `Compte local initialisé : ${localId}` : `Local profile initialized: ${localId}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('kilimo_farmer_email');
    localStorage.removeItem('kilimo_farmer_id');
    setFarmerAccount(null);
    setHistoryList([]);
    setSuccessMsg(null);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl bg-[#090D16] border border-slate-800 rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
              <History className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white tracking-tight truncate">
                  {isFr ? "Historique & Factures Agricoles" : isSw ? "Historia ya Mkulima na Stakabadhi" : "Farmer History & Dispatch Ledger"}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                  Cloud Firestore
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">
                {isFr ? "Bordereaux de transport et arbitrages de prix certifiés" : isSw ? "Hati za usafirishaji na rekodi za masoko" : "Persistent multi-agent waybills and freight records"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          
          {/* Account Status / Connect Card */}
          {farmerAccount?.email ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {farmerAccount.farmerId || "KM-FARMER-GUEST"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {historyList.length} {isFr ? "bordereaux archivés" : isSw ? "rekodi" : "records"}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {farmerAccount.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fetchFarmerHistory(farmerAccount.email)}
                  disabled={isLoading}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition cursor-pointer"
                  title="Refresh history"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition cursor-pointer"
                  title="Disconnect account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isFr ? "Déconnexion" : isSw ? "Ondoka" : "Disconnect"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                <GeminiIcon className="w-4 h-4 text-emerald-400" />
                <span>{isFr ? "Lier votre identité de producteur agricole" : isSw ? "Unganisha akaunti yako ya mkulima" : "Link or Create Farmer Identity"}</span>
              </div>
              <p className="text-xs text-slate-300">
                {isFr
                  ? "Entrez votre email pour conserver un historique sécurisé dans Cloud Firestore de tous vos arbitrages de prix et bordereaux de transport."
                  : isSw
                  ? "Weka barua pepe yako ili kuhifadhi historia ya stakabadhi zako zote za usafirishaji na bei za masoko kwenye Cloud Firestore."
                  : "Enter your email to maintain a persistent audit trail and historical record in Cloud Firestore for all your freight dispatches and arbitrage payouts."}
              </p>

              <form onSubmit={handleConnectEmail} className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={isFr ? "ex: producteur.jean@gmail.com" : "e.g. farmer.james@agri.com"}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <span>{isLoading ? (isFr ? "Connexion..." : "Connecting...") : (isFr ? "Accéder à mon compte" : isSw ? "Unganisha Akaunti" : "Connect / Create Profile")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Historical Waybills List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
              <span className="uppercase tracking-wider text-[10px] font-black text-slate-500">
                {isFr ? "Bordereaux & Expéditions Archivés" : isSw ? "Historia ya Stakabadhi" : "Archived Dispatches & Waybills"}
              </span>
              <span>{historyList.length} {isFr ? "enregistrements" : "entries"}</span>
            </div>

            {historyList.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-bold text-slate-300">
                  {isFr ? "Aucun bordereau dans l'historique" : isSw ? "Hakuna stakabadhi bado" : "No saved dispatches yet"}
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isFr
                    ? "Lancez une expédition depuis les Cartes Guidées ou le Quick Prompt pour générer votre premier bordereau."
                    : isSw
                    ? "Anzisha usafirishaji kutoka Kadi za Mwongozo ili kutengeneza stakabadhi yako ya kwanza."
                    : "Execute a harvest dispatch from the Guided Cards or Quick Prompt to generate your first audit record."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {historyList.map((item, idx) => {
                  const s = item.summary || {};
                  const txId = item.transaction_id || `tx_${idx}`;
                  const crop = s.commodity || s.crop || "Maize (Mahindi)";
                  const vol = s.volume_kg || s.weight || 1500;
                  const payout = s.net_payout || s.netFarmerPayout || "$615.00 USD";
                  const hub = s.destination || s.optimalHub || "Border Trade Zone";
                  const origin = s.origin || s.origin_depot || "Bunia Depot";
                  const eta = s.transit_eta || s.transitEta || "6.0 Hours";
                  const waybill = s.waybill_id || `KILIMO-WB-${txId.slice(-8).toUpperCase()}`;
                  const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Recently";

                  return (
                    <div
                      key={txId}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-emerald-500/40 transition group space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[11px] font-bold text-cyan-300">
                              {waybill}
                            </span>
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              COMPLETED
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-white mt-1">
                            {crop} • {vol.toLocaleString()} KG
                          </h4>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                            <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{origin} ➔ {hub} ({eta})</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">{isFr ? "Paiement Net" : "Net Payout"}</div>
                          <div className="text-base font-black text-emerald-400">{payout}</div>
                          <div className="text-[10px] text-slate-500 flex items-center justify-end space-x-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{dateStr}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-900">
                        {onLoadDispatch && (
                          <button
                            type="button"
                            onClick={() => {
                              onLoadDispatch(item);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer border border-slate-800"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isFr ? "Visualiser ce bordereau" : isSw ? "Tazama Stakabadhi" : "Load Dispatch"}</span>
                          </button>
                        )}
                        {onExportWaybill && (
                          <button
                            type="button"
                            onClick={() => {
                              onExportWaybill(item);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isFr ? "Imprimer PDF" : "Waybill PDF"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>KilimoAgent Firestore State Ledger</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer border border-slate-800"
          >
            {isFr ? "Fermer" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
