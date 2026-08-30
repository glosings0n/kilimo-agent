import { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  TrendingUp,
  Truck,
  Eye,
  FileText,
  AlertCircle,
  Zap,
  RotateCcw,
  Cpu,
  X,
  Menu,
  MapPin,
  Scale,
  MessageSquare,
  Navigation,
  Layers
} from 'lucide-react';

import GeminiIcon from './components/GeminiIcon';
import Sidebar from './components/Sidebar';
import MultimodalInputCapsule from './components/MultimodalInputCapsule';
import HarvestCardStack from './components/HarvestCardStack';
import GeospatialRouteMap from './components/GeospatialRouteMap';
import PipelineStepper from './components/PipelineStepper';
import ArbitrageChart from './components/ArbitrageChart';
import MultimodalInsights from './components/MultimodalInsights';
import WaybillCard from './components/WaybillCard';
import LedgerView from './components/LedgerView';
import ArchitectureModal from './components/ArchitectureModal';
import WhatsAppSimulatorModal from './components/WhatsAppSimulatorModal';
import GeminiLiveModal from './components/GeminiLiveModal';
import ResponseShimmerSkeleton from './components/ResponseShimmerSkeleton';

import { PRESET_SCENARIOS } from './utils/presets';
import { translations } from './utils/translations';
import { parseExecutionLedger } from './utils/parser';
import { voiceAgent } from './utils/audioSynthesizer';

const DEFAULT_API_BASE = "https://kilimo-backend-840262173056.us-central1.run.app";

export default function App() {
  const [lang, setLang] = useState('en');
  const [backendUrl, setBackendUrl] = useState(DEFAULT_API_BASE);
  const [showArchModal, setShowArchModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [inputMode, setInputMode] = useState('guided'); // 'guided' | 'quick'

  // Multimodal Inputs
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [audioPresetUrl, setAudioPresetUrl] = useState(null);
  const [audioName, setAudioName] = useState(null);
  const [notes, setNotes] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [cropOverride, setCropOverride] = useState("");
  const [volumeOverride, setVolumeOverride] = useState("");
  const [locationOverride, setLocationOverride] = useState("");

  // Pipeline Execution State
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [error, setError] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState('report'); // 'report' | 'arbitrage' | 'map' | 'ledger'
  const [rawReport, setRawReport] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const t = translations[lang] || translations.en;

  const handleSelectPreset = async (preset) => {
    setSelectedPresetId(preset.id);
    setImagePreview(preset.imagePath);
    setAudioPresetUrl(preset.audioPath);
    setAudioName(preset.audioName);
    setFarmerId(preset.farmerId);
    setCropOverride(preset.crop || "");
    setVolumeOverride(preset.volumeKg ? String(preset.volumeKg) : "");
    setLocationOverride(preset.location || "");
    setNotes(preset.audioPath ? "" : (preset.notes || ""));
    setError(null);
    setHasExecuted(false);
    setRawReport(null);
    setParsedData(null);

    // Fetch actual image file blob if available
    if (preset.imagePath) {
      try {
        const imgRes = await fetch(preset.imagePath);
        if (imgRes.ok) {
          const blob = await imgRes.blob();
          setImageFile(new File([blob], preset.imageName || "sample_harvest.jpg", { type: blob.type || "image/jpeg" }));
        }
      } catch (e) {
        console.warn("Could not fetch preset image blob:", e);
      }
    }

    // Fetch actual audio file blob if available
    if (preset.audioPath) {
      try {
        const audRes = await fetch(preset.audioPath);
        if (audRes.ok) {
          const blob = await audRes.blob();
          setAudioFile(new File([blob], preset.audioName || "sample_voice.mp4", { type: blob.type || "audio/mp4" }));
        }
      } catch (e) {
        console.warn("Could not fetch preset audio blob:", e);
      }
    }
  };

  const handleNotesChange = (text) => {
    setNotes(text);
    if (selectedPresetId) {
      setSelectedPresetId(null);
    }
  };

  // Auto-dismiss error alert after 6 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e, overrides = null) => {
    if (e) e.preventDefault();

    const effectiveCrop = overrides?.crop || cropOverride || "Maize (Zea mays)";
    const effectiveVolume = overrides?.volume_kg ? parseFloat(overrides.volume_kg) : (parseFloat(volumeOverride) || 2700);
    const effectiveLocation = overrides?.location || locationOverride || "Bunia Depot";
    const effectiveNotes = notes || `${effectiveCrop} harvest of ${effectiveVolume.toLocaleString()} kg ready for dispatch from ${effectiveLocation}.`;

    // Guard: Require at least some input
    const hasInput = Boolean(
      (notes && notes.trim().length > 0) ||
      audioName || audioFile || audioPresetUrl ||
      imageFile || imagePreview ||
      cropOverride || volumeOverride || selectedPresetId ||
      inputMode === 'guided' || overrides
    );
    if (!hasInput) {
      setError("Please provide either a farmer voice note, text prompt, or harvest parameters before dispatching.");
      return;
    }

    setLoading(true);
    setError(null);
    setHasExecuted(true);
    setActiveStep(1);
    voiceAgent.stop();
    setIsSpeaking(false);

    const formData = new FormData();
    if (farmerId) formData.append('farmer_id', farmerId);
    if (effectiveCrop) formData.append('crop', effectiveCrop);
    if (effectiveVolume) formData.append('volume_kg', String(effectiveVolume));
    if (effectiveLocation) formData.append('location', effectiveLocation);
    formData.append('notes', effectiveNotes);
    formData.append('lang', lang);

    if (imageFile) {
      formData.append('image', imageFile);
    } else if (imagePreview && imagePreview.startsWith('/')) {
      try {
        const imgRes = await fetch(imagePreview);
        if (imgRes.ok) {
          const blob = await imgRes.blob();
          formData.append('image', blob, 'harvest_specimen.jpg');
        }
      } catch (e) {}
    }

    if (audioFile) {
      formData.append('audio', audioFile);
    } else if (audioPresetUrl && audioPresetUrl.startsWith('/')) {
      try {
        const audRes = await fetch(audioPresetUrl);
        if (audRes.ok) {
          const blob = await audRes.blob();
          formData.append('audio', blob, 'farmer_voice_note.mp4');
        }
      } catch (e) {}
    }

    try {
      setActiveStep(2);
      const stepTimer1 = setTimeout(() => setActiveStep(3), 800);
      const stepTimer2 = setTimeout(() => setActiveStep(4), 1600);

      const response = await fetch(`${backendUrl}/api/v1/dispatch`, {
        method: 'POST',
        body: formData,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned HTTP ${response.status}: Failed to process dispatch`);
      }

      setActiveStep(5);
      const data = await response.json();
      setActiveStep(6);

      const reportPayload = data.executive_report || data;
      setRawReport(typeof reportPayload === 'string' ? reportPayload : JSON.stringify(reportPayload, null, 2));
      const parsed = parseExecutionLedger(reportPayload, {
        farmerId: data.farmer_id || farmerId,
        language: data.language || lang
      });
      setParsedData(parsed);
      setActiveStep(7);
    } catch (err) {
      console.error("[Live Dispatch Pipeline Error]:", err);
      setError(err.message || "Failed to execute backend dispatch request.");
      setHasExecuted(false);
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };

  // Quick Follow-Up Actions
  const handleSimulate5000Kg = () => {
    if (!parsedData) return;
    const vol = 5000;
    setVolumeOverride("5000");

    const updatedHubs = (parsedData.arbitrage?.hubs || []).map(h => {
      const gross = vol * h.price;
      const freight = vol * 0.04;
      const net = gross - freight;
      return { ...h, gross, freight, net };
    });

    const optimal = updatedHubs.find(h => h.selected) || updatedHubs[0] || { net: vol * 0.41 };
    const baseline = updatedHubs.find(h => !h.selected) || updatedHubs[updatedHubs.length - 1];
    const diff = baseline ? (optimal.net - baseline.net) : 180;
    const pct = baseline && baseline.net > 0 ? ((diff / baseline.net) * 100).toFixed(1) : "20.5";

    setParsedData({
      ...parsedData,
      audio: {
        ...parsedData.audio,
        weight: vol,
        weightFormatted: `${vol.toLocaleString()}.0 KG`
      },
      arbitrage: {
        ...parsedData.arbitrage,
        hubs: updatedHubs,
        netFarmerPayout: optimal.net,
        netPayoutFormatted: `$${optimal.net.toFixed(2)} USD`,
        arbitrageAdvantage: `+$${diff.toFixed(2)} USD`,
        arbitrageAdvantagePct: `+${pct}%`
      },
      freight: {
        ...parsedData.freight,
        freightCost: vol * 0.04,
        freightCostFormatted: `$${(vol * 0.04).toFixed(2)} USD`
      }
    });
    setActiveTab('arbitrage');
  };

  const handleLockNakuruRoute = (opp) => {
    if (!parsedData) return;
    const hubName = opp?.name || "Nakuru Millers & Feed Mill";
    const vol = parsedData.audio?.weight || 1500;
    const spotPrice = opp?.spotPrice || 0.44;
    const gross = vol * spotPrice;
    const freight = 45.00;
    const net = gross - freight;

    setParsedData({
      ...parsedData,
      arbitrage: {
        ...parsedData.arbitrage,
        optimalHub: hubName,
        netFarmerPayout: net,
        netPayoutFormatted: `$${net.toFixed(2)} USD`,
        arbitrageAdvantage: "+$85.00 USD",
        arbitrageAdvantagePct: "+18.2%"
      },
      freight: {
        ...parsedData.freight,
        destination: hubName,
        carrier: "East-West AgroLogistics (Rift Valley Fleet)",
        transitEta: "3.5 Hours",
        freightCost: freight,
        freightCostFormatted: `$${freight.toFixed(2)} USD`
      }
    });
    setActiveTab('geospatial');
  };

  const handleExportWaybillPdf = () => {
    setActiveTab('waybill');
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleDispatchWhatsApp = () => {
    setShowWhatsAppModal(true);
  };

  const handleVoiceSummary = () => {
    if (isSpeaking) {
      voiceAgent.stop();
      setIsSpeaking(false);
      return;
    }

    if (!parsedData) return;

    let textToSpeak;
    if (lang === 'fr') {
      textToSpeak = `KilimoAgent a validé votre récolte. Volume vérifié : ${parsedData.audio.weightFormatted}. Qualité : ${parsedData.visual.qualityGrade}. Le meilleur marché est ${parsedData.arbitrage.optimalHub} avec un paiement net de ${parsedData.arbitrage.netPayoutFormatted}. Transporteur East-West AgroLogistics réservé sous la lettre de voiture numéro ${parsedData.freight.waybillId}.`;
    } else if (lang === 'sw') {
      textToSpeak = `KilimoAgent imekamilisha uchambuzi wa mazao. Uzito uliothibitishwa ni kilo ${parsedData.audio.weight}. Ubora ni daraja A. Soko lenye faida ya juu zaidi ni ${parsedData.arbitrage.optimalHub} na mkulima atapokea ${parsedData.arbitrage.netPayoutFormatted}. Lori la usafirishaji limehifadhiwa kwa tiketi namba ${parsedData.freight.waybillId}.`;
    } else {
      textToSpeak = `KilimoAgent has verified your harvest. Verified batch volume: ${parsedData.audio.weightFormatted}. Visual grade: ${parsedData.visual.qualityGrade}. Selected optimal market hub is ${parsedData.arbitrage.optimalHub} with a net payout of ${parsedData.arbitrage.netPayoutFormatted}. Freight carrier dispatched with Waybill ID ${parsedData.freight.waybillId}.`;
    }

    setIsSpeaking(true);
    voiceAgent.speak(textToSpeak, lang, () => {
      setIsSpeaking(false);
    });
  };

  const resetToNewDispatch = () => {
    setSelectedPresetId(null);
    setImagePreview(null);
    setImageFile(null);
    setAudioPresetUrl(null);
    setAudioFile(null);
    setAudioName(null);
    setNotes("");
    setFarmerId("");
    setCropOverride("");
    setVolumeOverride("");
    setLocationOverride("");
    setError(null);
    setHasExecuted(false);
    setActiveStep(0);
    voiceAgent.stop();
    setIsSpeaking(false);
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#090D16] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      {/* Collapsible Left Sidebar (Inspired by Gemini Studio UI) */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        onNewDispatch={resetToNewDispatch}
        onOpenArch={() => setShowArchModal(true)}
        lang={lang}
        setLang={setLang}
      />

      {/* Mobile Drawer Hamburger Trigger Button */}
      <button
        onClick={() => setIsSidebarExpanded(true)}
        className="md:hidden fixed top-3 left-3 z-30 p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white shadow-xl backdrop-blur-md cursor-pointer"
        title="Open navigation drawer"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Main Content Area (Smoothly adjusts with Sidebar width on desktop, full width on mobile) */}
      <div className={`flex-1 h-full max-h-full flex flex-col transition-all duration-300 ${
        isSidebarExpanded ? 'md:pl-72' : 'md:pl-16'
      } pl-0 overflow-hidden`}>
        
        {/* State 1: Before Execution (Centered Landing Layout with naturally attached Footer) */}
        {!hasExecuted && (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar min-h-0">
            <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 lg:px-8 flex flex-col justify-center py-4 sm:py-8 space-y-4 sm:space-y-6">
              {/* Initial View: What harvest can KilimoAgent dispatch today? */}
              <div className="text-center max-w-2xl mx-auto space-y-1.5 pt-8 sm:pt-0 shrink-0">
                <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
                  {lang === 'fr' 
                    ? "Que souhaitez-vous expédier aujourd'hui ?"
                    : lang === 'sw'
                    ? "Ungependa kusafirisha mazao gani leo?"
                    : "What harvest can KilimoAgent dispatch today?"}
                </h1>
              </div>

              {/* Mode Toggle: Quick Prompt vs Guided Card Stack */}
              <div className="flex items-center justify-center space-x-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 w-fit mx-auto shadow-2xl backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setInputMode('guided')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    inputMode === 'guided'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <GeminiIcon className="w-3.5 h-3.5" />
                  <span>{t.guidedCardStack || "Guided Card Stack"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode('quick')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    inputMode === 'quick'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{t.quickPrompt || "Quick Prompt"}</span>
                </button>
              </div>

              {/* Error Notice with Close (X) Button */}
              {error && (
                <div className="max-w-3xl mx-auto p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-xl animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span className="font-semibold">{error}</span>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition cursor-pointer"
                    title="Close alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mode 1: Guided 5-Step Card Stack */}
              {inputMode === 'guided' ? (
                <HarvestCardStack
                  cropOverride={cropOverride}
                  setCropOverride={setCropOverride}
                  volumeOverride={volumeOverride}
                  setVolumeOverride={setVolumeOverride}
                  locationOverride={locationOverride}
                  setLocationOverride={setLocationOverride}
                  farmerId={farmerId}
                  setFarmerId={setFarmerId}
                  notes={notes}
                  setNotes={setNotes}
                  imagePreview={imagePreview}
                  setImagePreview={setImagePreview}
                  setImageFile={setImageFile}
                  audioName={audioName}
                  setAudioName={setAudioName}
                  audioFile={audioFile}
                  setAudioFile={setAudioFile}
                  audioPresetUrl={audioPresetUrl}
                  setAudioPresetUrl={setAudioPresetUrl}
                  loading={loading}
                  onSubmit={handleSubmit}
                  lang={lang}
                  backendUrl={backendUrl}
                />
              ) : (
                /* Mode 2: Quick Multimodal Input Capsule */
                <MultimodalInputCapsule
                  notes={notes}
                  setNotes={handleNotesChange}
                  imagePreview={imagePreview}
                  setImagePreview={setImagePreview}
                  setImageFile={setImageFile}
                  audioName={audioName}
                  setAudioName={setAudioName}
                  audioFile={audioFile}
                  setAudioFile={setAudioFile}
                  audioPresetUrl={audioPresetUrl}
                  setAudioPresetUrl={setAudioPresetUrl}
                  loading={loading}
                  onSubmit={handleSubmit}
                  onOpenLive={() => setShowLiveModal(true)}
                  lang={lang}
                  showAdvanced={showAdvanced}
                  setShowAdvanced={setShowAdvanced}
                  farmerId={farmerId}
                  setFarmerId={setFarmerId}
                  cropOverride={cropOverride}
                  setCropOverride={setCropOverride}
                  volumeOverride={volumeOverride}
                  setVolumeOverride={setVolumeOverride}
                  locationOverride={locationOverride}
                  setLocationOverride={setLocationOverride}
                  hasExecuted={false}
                  backendUrl={backendUrl}
                  setLang={setLang}
                />
              )}
            </main>

            {/* Minimal Footer always inside landing view */}
            <footer className="border-t border-slate-800/80 bg-[#090D16] py-3 px-4 text-center text-xs text-slate-500 space-y-0.5 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
              <p className="font-semibold text-slate-400 text-[11px] sm:text-xs truncate sm:whitespace-normal">
                KilimoAgent • Multimodal Agricultural Arbitrage & Carrier Dispatch Engine
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium truncate sm:whitespace-normal">
                Powered by Gemini 3.6 Flash • Gemma 2 (9B-IT) • Google Cloud Run • Google Cloud Firestore
              </p>
            </footer>
          </div>
        )}

        {/* State 2: After Execution (Scrollable Results on Top + Fixed Pinned Input at Bottom) */}
        {hasExecuted && (
          <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden">
            {/* Scrollable Results Stream (Only this section scrolls) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-h-0">
              
              {/* Error Notice if any during conversation */}
              {error && (
                <div className="max-w-4xl mx-auto p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-xl animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span className="font-semibold">{error}</span>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition cursor-pointer"
                    title="Close alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Shimmer state while model is generating */}
              {loading && (
                <ResponseShimmerSkeleton lang={lang} />
              )}

              {/* Real Generated Dashboard Data */}
              {!loading && parsedData && (
                <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {/* Hero KPI Summary Bar */}
                  <div className="rounded-3xl bg-[#0F172A] border border-slate-800 p-6 shadow-2xl relative overflow-hidden space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-0.5 rounded-full text-xs font-bold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {t.statusConfirmed}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            {parsedData.txId}
                          </span>
                        </div>
                        <h3 className="text-2xl font-extrabold text-white mt-1">
                          {t.resultsTitle}
                        </h3>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Reset Button */}
                        <button
                          onClick={resetToNewDispatch}
                          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
                          title="Start New Dispatch"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.actionNewRun}</span>
                        </button>

                        {/* Speech Synthesizer Button */}
                        <button
                          onClick={handleVoiceSummary}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                            isSpeaking
                              ? 'bg-amber-500 text-slate-950 animate-pulse shadow-lg shadow-amber-500/30'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                          }`}
                        >
                          {isSpeaking ? (
                            <>
                              <VolumeX className="w-4 h-4" />
                              <span>{t.btnStopSpeech}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-4 h-4 text-amber-400" />
                              <span>{t.btnSpeechReadout}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 4 Core KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* KPI 1: Net Payout */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/40">
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          {t.payoutLabel}
                        </div>
                        <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-0.5">
                          {parsedData.arbitrage.netPayoutFormatted}
                        </div>
                      </div>

                      {/* KPI 2: Optimal Hub */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          {t.bestHubLabel}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-white mt-1 truncate" title={parsedData.arbitrage.optimalHub}>
                          {parsedData.arbitrage.optimalHub}
                        </div>
                      </div>

                      {/* KPI 3: Volume */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          {t.volumeExtractedLabel}
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-amber-300 mt-1">
                          {parsedData.audio.weightFormatted}
                        </div>
                      </div>

                      {/* KPI 4: Quality */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          {t.qualityGradeLabel}
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-emerald-400 mt-1">
                          {parsedData.visual.qualityGrade}
                        </div>
                      </div>
                    </div>

                    {/* Quick Follow-Up Action Chips */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      <span className="text-[11px] font-bold uppercase text-slate-400 whitespace-nowrap flex items-center space-x-1 pl-1">
                        <GeminiIcon className="w-3.5 h-3.5" />
                        <span>Quick Follow-Up:</span>
                      </span>

                      <button
                        onClick={handleSimulate5000Kg}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95"
                        title="Re-calculate arbitrage economics for 5,000 KG"
                      >
                        <Scale className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.actionSimulate5k}</span>
                      </button>

                      <button
                        onClick={() => handleLockNakuruRoute({ name: "Nakuru Millers & Feed Mill", spotPrice: 0.44 })}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95"
                        title="Lock in route to Nakuru Millers corridor hub"
                      >
                        <Truck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t.actionLockRoute}</span>
                      </button>

                      <button
                        onClick={handleExportWaybillPdf}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95"
                        title="Print or export official carrier bill of lading"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.actionExportWaybill}</span>
                      </button>

                      <button
                        onClick={handleDispatchWhatsApp}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95"
                        title="Open WhatsApp Field Gateway Dispatch"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.actionDispatchWhatsApp}</span>
                      </button>
                    </div>
                  </div>

                  {/* Dashboard Tab Navigation (Centered) */}
                  <div className="flex items-center justify-center space-x-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto mx-auto w-fit max-w-full">
                    <button
                      onClick={() => setActiveTab('arbitrage')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'arbitrage'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>{t.tabArbitrage}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('geospatial')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'geospatial'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Navigation className="w-4 h-4" />
                      <span>{t.tabGeospatial || "Geospatial Map & Radar"}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('multimodal')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'multimodal'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span>{t.tabMultimodal}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('waybill')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'waybill'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      <span>{t.tabWaybill}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('architecture')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'architecture'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Cpu className="w-4 h-4" />
                      <span>{t.tabArchitecture}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('ledger')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'ledger'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>{t.tabLedger}</span>
                    </button>
                  </div>

                  {/* Tab Views */}
                  {activeTab === 'arbitrage' && (
                    <ArbitrageChart
                      arbitrageData={parsedData.arbitrage}
                      lang={lang}
                    />
                  )}

                  {activeTab === 'geospatial' && (
                    <GeospatialRouteMap
                      originName={parsedData.audio?.origin || locationOverride || "Bunia Depot"}
                      destinationName={parsedData.freight?.destination || parsedData.arbitrage?.optimalHub || "Border Trade Zone Wholesale Terminal"}
                      commodity={parsedData.audio?.commodity || cropOverride || "Maize (Grade A)"}
                      volumeKg={parsedData.audio?.weight || parseFloat(volumeOverride) || 1500}
                      netPayoutFormatted={parsedData.arbitrage?.netPayoutFormatted || "$615.00 USD"}
                      transitEta={parsedData.freight?.transitEta || "6.0 Hours"}
                      carrier={parsedData.freight?.carrier || "East-West AgroLogistics Fleet"}
                      waybillId={parsedData.freight?.waybillId || "KILIMO-WB-63F15ADA"}
                      arbitrageData={parsedData.arbitrage}
                      onSelectRouteOverride={handleLockNakuruRoute}
                    />
                  )}

                  {activeTab === 'multimodal' && (
                    <MultimodalInsights
                      audioData={parsedData.audio}
                      visualData={parsedData.visual}
                      lang={lang}
                    />
                  )}

                  {activeTab === 'waybill' && (
                    <div id="printable-waybill">
                      <WaybillCard
                        freightData={parsedData.freight}
                        farmerId={parsedData.txId}
                        commodity={parsedData.audio.commodity}
                        volumeFormatted={parsedData.audio.weightFormatted}
                        lang={lang}
                      />
                    </div>
                  )}

                  {activeTab === 'architecture' && (
                    <PipelineStepper
                      activeStep={activeStep}
                      isExecuting={loading}
                      lang={lang}
                      parsedData={parsedData}
                    />
                  )}

                  {activeTab === 'ledger' && (
                    <LedgerView
                      rawText={rawReport}
                      lang={lang}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Fixed Pinned Bottom Input Capsule (Permanently visible, zero page scroll) */}
            <div className="shrink-0 w-full bg-[#090D16]/95 backdrop-blur-md border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3 z-30 shadow-2xl">
              <div className="max-w-4xl mx-auto w-full">
                <MultimodalInputCapsule
                  notes={notes}
                  setNotes={handleNotesChange}
                  imagePreview={imagePreview}
                  setImagePreview={setImagePreview}
                  setImageFile={setImageFile}
                  audioName={audioName}
                  setAudioName={setAudioName}
                  setAudioFile={setAudioFile}
                  setAudioPresetUrl={setAudioPresetUrl}
                  audioFile={audioFile}
                  audioPresetUrl={audioPresetUrl}
                  loading={loading}
                  onSubmit={handleSubmit}
                  onOpenLive={() => setShowLiveModal(true)}
                  lang={lang}
                  showAdvanced={showAdvanced}
                  setShowAdvanced={setShowAdvanced}
                  farmerId={farmerId}
                  setFarmerId={setFarmerId}
                  cropOverride={cropOverride}
                  setCropOverride={setCropOverride}
                  volumeOverride={volumeOverride}
                  setVolumeOverride={setVolumeOverride}
                  locationOverride={locationOverride}
                  setLocationOverride={setLocationOverride}
                  hasExecuted={true}
                  setLang={setLang}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Floating Action Button (FAB) in Bottom Right (Material Design 3 Standards with Safe-Area & Toolbar offset) */}
      <div className={`fixed z-40 transition-all duration-300 ${
        hasExecuted
          ? 'bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:bottom-20 right-4 sm:right-6'
          : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 right-4 sm:right-6'
      }`}>
        <button
          onClick={() => setShowWhatsAppModal(true)}
          className="relative group w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all duration-150 cursor-pointer"
          title="Open WhatsApp Field Gateway Simulator"
        >
          <img
            src="/icons/whatsapp.svg"
            alt="WhatsApp Bot"
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
          />
          {/* Tooltip on hover */}
          <span className="absolute right-16 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none hidden sm:inline">
            WhatsApp Field Gateway
          </span>
          {/* Live indicator badge */}
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#090D16]"></span>
        </button>
      </div>

      {/* Engineering Pipeline & Architecture Modal */}
      <ArchitectureModal
        isOpen={showArchModal}
        onClose={() => setShowArchModal(false)}
        backendUrl={backendUrl}
        setBackendUrl={setBackendUrl}
      />

      {/* WhatsApp Simulator Modal */}
      <WhatsAppSimulatorModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        backendUrl={backendUrl}
        lang={lang}
      />

      {/* Gemini Live Multimodal Modal (Voice & Video) */}
      <GeminiLiveModal
        isOpen={showLiveModal}
        onClose={() => setShowLiveModal(false)}
        lang={lang}
        backendUrl={backendUrl}
        onCommitDispatch={(liveParams) => {
          if (liveParams) {
            if (liveParams.crop) setCropOverride(liveParams.crop);
            if (liveParams.volume_kg) setVolumeOverride(String(liveParams.volume_kg));
            if (liveParams.origin_depot) setLocationOverride(liveParams.origin_depot);
            if (liveParams.crop && liveParams.volume_kg && liveParams.origin_depot) {
              handleSubmit(null, {
                crop: liveParams.crop,
                volume_kg: liveParams.volume_kg,
                location: liveParams.origin_depot
              });
            }
          }
        }}
      />
    </div>
  );
}