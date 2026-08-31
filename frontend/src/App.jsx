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
  Scale,
  MessageSquare,
  Navigation
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
import FarmerHistoryModal from './components/FarmerHistoryModal';
import ResponseShimmerSkeleton from './components/ResponseShimmerSkeleton';
import ErrorBoundary from './components/ErrorBoundary';

import { translations } from './utils/translations';
import { parseExecutionLedger } from './utils/parser';
import { voiceAgent } from './utils/audioSynthesizer';

const getInitialBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return 'http://localhost:8000';
    }
  }
  return import.meta.env.VITE_BACKEND_URL || "https://kilimo-backend-840262173056.us-central1.run.app";
};

const getInitialInputMode = () => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/quick-prompt') || path.includes('/quick') || path.includes('/prompt')) {
      return 'quick';
    }
    if (path.includes('/guided-card') || path.includes('/guided') || path.includes('/cards')) {
      return 'guided';
    }
  }
  return 'guided';
};

export default function App() {
  const [lang, setLang] = useState('en');
  const [backendUrl, setBackendUrl] = useState(getInitialBackendUrl);
  const [showArchModal, setShowArchModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [inputMode, setInputMode] = useState(getInitialInputMode); // 'guided' | 'quick'
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dispatchKey, setDispatchKey] = useState(0);
  const [isChatActive, setIsChatActive] = useState(false);

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
  const [activeTab, setActiveTab] = useState('arbitrage'); // 'arbitrage' | 'geospatial' | 'multimodal' | 'waybill' | 'architecture' | 'ledger'
  const [rawReport, setRawReport] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Farmer Identity & Cloud Firestore State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [farmerAccount, setFarmerAccount] = useState(() => {
    try {
      const em = localStorage.getItem('kilimo_farmer_email');
      const fid = localStorage.getItem('kilimo_farmer_id');
      if (em) return { email: em, farmerId: fid || 'KM-FARMER-DEFAULT' };
    } catch (e) {}
    return null;
  });
  const [postDispatchEmail, setPostDispatchEmail] = useState('');
  const [isLinkingPostDispatch, setIsLinkingPostDispatch] = useState(false);
  const [linkDispatchSuccess, setLinkDispatchSuccess] = useState(false);

  const t = translations[lang] || translations.en;

  const switchInputMode = (mode) => {
    setInputMode(mode);
    setHasExecuted(false);
    setIsChatActive(false);
    try {
      const targetPath = mode === 'quick' ? '/quick-prompt' : '/guided-card';
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    } catch {
      // Ignored for non-browser/restricted iframe contexts
    }
  };

  // Synchronize modal and page paths (/engineering, /whatsapp, /live, /quick-prompt, /guided-card)
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/' || path === '') {
        try {
          window.history.replaceState(null, '', '/guided-card');
        } catch {
          // Ignored
        }
        setInputMode('guided');
        setHasExecuted(false);
        return;
      }
      if (path.includes('/engineering') || path.includes('/pipeline') || path.includes('/architecture')) {
        setShowArchModal(true);
      } else if (path.includes('/whatsapp')) {
        setShowWhatsAppModal(true);
      } else if (path.includes('/live')) {
        setShowLiveModal(true);
      } else if (path.includes('/history') || path.includes('/ledger') || path.includes('/factures')) {
        setShowHistoryModal(true);
      } else if (path.includes('/quick-prompt') || path.includes('/quick') || path.includes('/prompt')) {
        setInputMode('quick');
        setHasExecuted(false);
      } else if (path.includes('/guided-card') || path.includes('/guided') || path.includes('/cards')) {
        setInputMode('guided');
        setHasExecuted(false);
      }
    };
    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  const openArchModal = () => {
    setShowArchModal(true);
    try {
      window.history.pushState(null, '', '/engineering');
    } catch {
      // Ignored
    }
  };

  const closeArchModal = () => {
    setShowArchModal(false);
    try {
      const fallback = inputMode === 'quick' ? '/quick-prompt' : '/guided-card';
      window.history.pushState(null, '', fallback);
    } catch {}
  };

  const openHistoryModal = () => {
    setShowHistoryModal(true);
    try {
      window.history.pushState(null, '', '/history');
    } catch {}
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    try {
      const fallback = inputMode === 'quick' ? '/quick-prompt' : '/guided-card';
      window.history.pushState(null, '', fallback);
    } catch {}
  };

  const openWhatsAppModal = () => {
    setShowWhatsAppModal(true);
    try {
      window.history.pushState(null, '', '/whatsapp');
    } catch {
      // Ignored
    }
  };

  const closeWhatsAppModal = () => {
    setShowWhatsAppModal(false);
    try {
      if (window.location.pathname.includes('/whatsapp')) {
        window.history.pushState(null, '', inputMode === 'quick' ? '/quick-prompt' : '/guided-card');
      }
    } catch {
      // Ignored
    }
  };

  const openLiveModal = () => {
    setShowLiveModal(true);
    try {
      window.history.pushState(null, '', '/live');
    } catch {
      // Ignored
    }
  };

  const closeLiveModal = () => {
    setShowLiveModal(false);
    try {
      if (window.location.pathname.includes('/live')) {
        window.history.pushState(null, '', inputMode === 'quick' ? '/quick-prompt' : '/guided-card');
      }
    } catch {
      // Ignored
    }
  };

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
      } catch {
        // Ignored for unreachable local asset
      }
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
      } catch {
        // Ignored for unreachable local asset
      }
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
        farmerId: data.farmer_id || farmerId || farmerAccount?.farmerId,
        language: data.language || lang
      });
      setParsedData(parsed);
      setActiveStep(7);

      // Cleanly reset input attachments and text notes so fields are fresh
      setNotes("");
      setImageFile(null);
      setImagePreview(null);
      setAudioFile(null);
      setAudioPresetUrl(null);
      setAudioName(null);

      // Auto-persist to Firestore if farmer has a linked account
      if (farmerAccount?.email) {
        try {
          fetch(`${backendUrl}/api/v1/farmer/link-dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: farmerAccount.email,
              farmer_id: farmerAccount.farmerId,
              transaction_id: parsed.txId || `tx_${Date.now()}`,
              summary: {
                commodity: parsed.audio?.commodity || effectiveCrop,
                volume_kg: parsed.audio?.weight || effectiveVolume,
                net_payout: parsed.arbitrage?.netPayoutFormatted || "$615.00 USD",
                destination: parsed.freight?.destination || parsed.arbitrage?.optimalHub,
                origin: parsed.audio?.origin || effectiveLocation,
                transit_eta: parsed.freight?.transitEta || "6.0 Hours",
                waybill_id: parsed.freight?.waybillId || "KILIMO-WB-DEFAULT"
              }
            })
          }).catch((e) => console.warn("Auto-link dispatch notice:", e));
        } catch (e) {}
      }
    } catch (err) {
      console.error("[Live Dispatch Pipeline Error]:", err);
      setError(err.message || "Failed to execute backend dispatch request.");
      setHasExecuted(false);
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCurrentDispatch = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = postDispatchEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !parsedData) return;

    setIsLinkingPostDispatch(true);
    try {
      // 1. Create or retrieve profile
      const profRes = await fetch(`${backendUrl}/api/v1/farmer/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      let fid = `KM-FARMER-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      if (profRes.ok) {
        const profData = await profRes.json();
        fid = profData.farmer_id || fid;
      }

      const newAccount = { email: cleanEmail, farmerId: fid };
      setFarmerAccount(newAccount);
      localStorage.setItem('kilimo_farmer_email', cleanEmail);
      localStorage.setItem('kilimo_farmer_id', fid);

      // 2. Link this transaction
      await fetch(`${backendUrl}/api/v1/farmer/link-dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          farmer_id: fid,
          transaction_id: parsedData.txId || `tx_${Date.now()}`,
          summary: {
            commodity: parsedData.audio?.commodity || cropOverride || "Maize",
            volume_kg: parsedData.audio?.weight || parseFloat(volumeOverride) || 1500,
            net_payout: parsedData.arbitrage?.netPayoutFormatted || "$615.00 USD",
            destination: parsedData.freight?.destination || parsedData.arbitrage?.optimalHub || "Border Trade Zone",
            origin: parsedData.audio?.origin || locationOverride || "Bunia Depot",
            transit_eta: parsedData.freight?.transitEta || "6.0 Hours",
            waybill_id: parsedData.freight?.waybillId || "KILIMO-WB-DEFAULT"
          }
        })
      });

      setLinkDispatchSuccess(true);
      setPostDispatchEmail('');
      setTimeout(() => setLinkDispatchSuccess(false), 5000);
    } catch (err) {
      console.warn("Failed to link dispatch:", err);
    } finally {
      setIsLinkingPostDispatch(false);
    }
  };

  const handleLoadHistoryDispatch = (item) => {
    if (!item) return;
    const s = item.summary || {};
    const fakeParsed = {
      txId: item.transaction_id || `tx_${Date.now()}`,
      audio: {
        commodity: s.commodity || "Maize (Grade A)",
        origin: s.origin || "Bunia Depot",
        weight: s.volume_kg || 1500,
        weightFormatted: `${(s.volume_kg || 1500).toLocaleString()}.0 KG`
      },
      visual: {
        specimen: s.commodity || "Maize (Grade A)",
        grade: "Grade A Export Standard",
        moistureScore: 12.4
      },
      arbitrage: {
        optimalHub: s.destination || "Border Trade Zone Wholesale Terminal",
        netFarmerPayout: parseFloat(String(s.net_payout || "").replace(/[^0-9.]/g, "")) || 615,
        netPayoutFormatted: s.net_payout || "$615.00 USD",
        arbitrageAdvantage: "+$180.00 USD",
        arbitrageAdvantagePct: "+20.5%",
        hubs: [
          { name: s.destination || "Border Trade Zone", price: 0.45, gross: (s.volume_kg || 1500) * 0.45, freight: 60, net: (s.volume_kg || 1500) * 0.45 - 60, selected: true }
        ]
      },
      freight: {
        destination: s.destination || "Border Trade Zone Wholesale Terminal",
        transitEta: s.transit_eta || "6.0 Hours",
        carrier: "East-West AgroLogistics Fleet",
        waybillId: s.waybill_id || `KILIMO-WB-${(item.transaction_id || '').slice(-8).toUpperCase()}`,
        freightCost: 60,
        freightCostFormatted: "$60.00 USD"
      }
    };
    setParsedData(fakeParsed);
    setHasExecuted(true);
    setActiveTab('arbitrage');
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
    setLoading(false);
    setParsedData(null);
    setRawReport(null);
    setActiveStep(0);
    setActiveTab('arbitrage');
    voiceAgent.stop();
    setIsSpeaking(false);
    setDispatchKey(prev => prev + 1);
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
        onOpenArch={openArchModal}
        onOpenHistory={openHistoryModal}
        farmerAccount={farmerAccount}
        inputMode={inputMode}
        onSelectInputMode={switchInputMode}
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
        
        {/* State 1: Before Execution */}
        {!hasExecuted && (
          <div className={`flex-1 h-full max-h-full flex flex-col ${
            inputMode === 'quick' && isChatActive ? 'min-h-0 overflow-hidden' : 'justify-between overflow-y-auto custom-scrollbar min-h-0'
          }`}>
            <main className={`flex-1 w-full mx-auto px-3 sm:px-6 flex flex-col ${
              inputMode === 'quick' && isChatActive
                ? 'max-w-4xl justify-end min-h-0 overflow-hidden py-2 pb-2 h-full'
                : 'max-w-5xl justify-center items-center my-auto py-8 sm:py-12 space-y-6'
            }`}>
              {/* Header Title & Mode Toggle (Only visible when NOT in active quick chat) */}
              {!(inputMode === 'quick' && isChatActive) && (
                <>
                  <div className="text-center max-w-2xl mx-auto space-y-1.5 shrink-0">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
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
                      onClick={() => switchInputMode('guided')}
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
                      onClick={() => switchInputMode('quick')}
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
                </>
              )}

              {/* Error Notice */}
              {error && (
                <div className="max-w-3xl w-full mx-auto p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-xl animate-in fade-in duration-200">
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

              {/* Mode Component (Single stable instance) */}
              <div className={`w-full ${inputMode === 'quick' && isChatActive ? 'flex-1 min-h-0 flex flex-col justify-end' : 'max-w-3xl mx-auto'}`}>
                {inputMode === 'guided' ? (
                  <ErrorBoundary onReset={() => switchInputMode('guided')}>
                    <HarvestCardStack
                      key={`guided-${dispatchKey}`}
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
                  </ErrorBoundary>
                ) : (
                  <ErrorBoundary onReset={() => switchInputMode('quick')}>
                    <MultimodalInputCapsule
                      key={`quick-${dispatchKey}`}
                      notes={notes}
                      setNotes={handleNotesChange}
                      imagePreview={imagePreview}
                      setImagePreview={setImagePreview}
                      imageFile={imageFile}
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
                      isChatActive={isChatActive}
                      setIsChatActive={setIsChatActive}
                    />
                  </ErrorBoundary>
                )}
              </div>
            </main>

            {/* Minimal Footer VISIBLE ONLY on landing / empty view */}
            {!(inputMode === 'quick' && isChatActive) && (
              <footer className="border-t border-slate-800/80 bg-[#090D16] py-3 px-4 text-center text-xs text-slate-500 space-y-0.5 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                <p className="font-semibold text-slate-400 text-[11px] sm:text-xs truncate sm:whitespace-normal">
                  KilimoAgent • Multimodal Agricultural Arbitrage & Carrier Dispatch Engine
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium truncate sm:whitespace-normal">
                  Powered by Gemini 3.6 Flash • Gemma 2 (9B-IT) • Google Cloud Run • Google Cloud Firestore
                </p>
              </footer>
            )}
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

                  {/* Firestore History Integration Notice / Banner */}
                  {!farmerAccount?.email && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-cyan-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center space-x-3 text-left min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <History className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-xs min-w-0">
                          <span className="font-bold text-white">
                            {lang === 'fr' ? "Conserver ce bordereau dans votre historique ?" : lang === 'sw' ? "Je, ungependa kuhifadhi stakabadhi hii?" : "Save this dispatch to your history?"}
                          </span>
                          <p className="text-[11px] text-slate-400 truncate">
                            {lang === 'fr' ? "Associez votre email pour retrouver toutes vos factures sur Cloud Firestore." : lang === 'sw' ? "Unganisha barua pepe yako ili kufikia rekodi zako zote." : "Link your email to access past receipts anytime."}
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleLinkCurrentDispatch} className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <input
                          type="email"
                          value={postDispatchEmail}
                          onChange={(e) => setPostDispatchEmail(e.target.value)}
                          placeholder={lang === 'fr' ? "votre.email@gmail.com" : "your.email@example.com"}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 flex-1 sm:w-56"
                        />
                        <button
                          type="submit"
                          disabled={isLinkingPostDispatch}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {isLinkingPostDispatch ? "..." : (lang === 'fr' ? "Sauvegarder" : lang === 'sw' ? "Hifadhi" : "Save")}
                        </button>
                      </form>
                    </div>
                  )}

                  {linkDispatchSuccess && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{lang === 'fr' ? "Bordereau enregistré avec succès dans votre historique Firestore !" : lang === 'sw' ? "Stakabadhi imehifadhiwa kwenye Cloud Firestore!" : "Dispatch successfully archived to your Cloud Firestore ledger!"}</span>
                    </div>
                  )}

                  {/* Dashboard Tab Navigation */}
                  <div className="w-full max-w-5xl mx-auto overflow-x-auto custom-scrollbar px-1 py-1">
                    <div className="flex items-center justify-start xl:justify-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 w-fit min-w-max mx-auto px-2">
                      <button
                        onClick={() => setActiveTab('arbitrage')}
                        className={`shrink-0 flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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
                        className={`shrink-0 flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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
                        className={`shrink-0 flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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
                        className={`shrink-0 flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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
                        className={`shrink-0 flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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
                        className={`shrink-0 flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                          activeTab === 'ledger'
                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>{t.tabLedger}</span>
                      </button>
                    </div>
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
                      lang={lang}
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
                    <WaybillCard
                      freightData={parsedData.freight}
                      farmerId={parsedData.txId}
                      commodity={parsedData.audio.commodity}
                      volumeFormatted={parsedData.audio.weightFormatted}
                      lang={lang}
                    />
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
                  key={`pinned-quick-${dispatchKey}`}
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
                  backendUrl={backendUrl}
                  setLang={setLang}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Buttons (FAB Stack) in Bottom Right: Gemini Live (Top, circular with red dot) + WhatsApp (Bottom) */}
      <div className={`fixed z-40 flex flex-col items-center gap-2.5 sm:gap-3 transition-all duration-300 ${
        hasExecuted
          ? 'bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:bottom-20 right-4 sm:right-6'
          : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 right-4 sm:right-6'
      }`}>
        {/* Gemini Live Circular Floating Button (Red border, pulsating indicator) */}
        <button
          type="button"
          onClick={openLiveModal}
          className="relative group w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-rose-950/80 hover:bg-rose-900/90 border-2 border-rose-500 hover:border-rose-400 text-rose-300 flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xl shadow-rose-500/30 ring-2 ring-rose-500/20 backdrop-blur-md hover:scale-105 active:scale-95"
          title="Open Gemini Live Multimodal Stream"
        >
          <GeminiIcon className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 group-hover:scale-110 transition-transform" />
          
          {/* Live pulsing red dot indicator on top */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-[#090D16]"></span>
          </span>

          {/* Tooltip on hover */}
          <span className="absolute right-14 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 shadow-2xl">
            Gemini Live Multimodal
          </span>
        </button>

        {/* WhatsApp Floating Action Button */}
        <button
          type="button"
          onClick={openWhatsAppModal}
          className="relative group w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all duration-150 cursor-pointer shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95"
          title="Open WhatsApp Field Gateway Simulator"
        >
          <img
            src="/icons/whatsapp.svg"
            alt="WhatsApp Bot"
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
          />
          {/* Tooltip on hover */}
          <span className="absolute right-16 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50 shadow-2xl">
            WhatsApp Field Gateway
          </span>
          {/* Live indicator badge */}
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#090D16]"></span>
        </button>
      </div>

      {/* Engineering Pipeline & Architecture Modal */}
      <ArchitectureModal
        isOpen={showArchModal}
        onClose={closeArchModal}
        backendUrl={backendUrl}
        setBackendUrl={setBackendUrl}
        lang={lang}
      />

      {/* WhatsApp Simulator Modal */}
      <WhatsAppSimulatorModal
        isOpen={showWhatsAppModal}
        onClose={closeWhatsAppModal}
        backendUrl={backendUrl}
        lang={lang}
        setLang={setLang}
      />

      {/* Gemini Live Multimodal Modal (Voice & Video) */}
      <GeminiLiveModal
        isOpen={showLiveModal}
        onClose={closeLiveModal}
        lang={lang}
        setLang={setLang}
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

      {/* Farmer History & Cloud Firestore Ledger Modal */}
      <FarmerHistoryModal
        isOpen={showHistoryModal}
        onClose={closeHistoryModal}
        backendUrl={backendUrl}
        farmerAccount={farmerAccount}
        setFarmerAccount={setFarmerAccount}
        onLoadDispatch={handleLoadHistoryDispatch}
        onExportWaybill={handleExportWaybillPdf}
        lang={lang}
      />
    </div>
  );
}