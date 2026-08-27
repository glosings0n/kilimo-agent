import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Wheat,
  Scale,
  MapPin,
  Camera,
  Mic,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  Package,
  Truck,
  LocateFixed,
  Layers,
  Map,
  X
} from 'lucide-react';
import GeminiIcon from './GeminiIcon';
import { translations } from '../utils/translations';
import { CountryFlag } from './Flags';

const CROPS = [
  {
    id: "maize",
    name: "Maize (Mahindi)",
    scientific: "Zea mays",
    icon: "🌽",
    color: "bg-slate-900 border-amber-500/30 text-amber-300",
    activeColor: "border-amber-400 bg-slate-900 ring-1 ring-amber-400 text-amber-300",
    tags: ["Flint Grade A", "Moisture < 12.5%", "Export Spec"],
    defaultNotes: "Nafaka zimekauka vizuri bila wadudu, tayari kwa soko.",
    avgPrice: "$0.45/KG"
  },
  {
    id: "cassava",
    name: "Cassava (Manioc)",
    scientific: "Manihot esculenta",
    icon: "🥔",
    color: "bg-slate-900 border-emerald-500/30 text-emerald-300",
    activeColor: "border-emerald-400 bg-slate-900 ring-1 ring-emerald-400 text-emerald-300",
    tags: ["High Starch", "Clean Root Tubers", "Industrial Spec"],
    defaultNotes: "Racines de manioc fraîchement récoltées, haute teneur en amidon.",
    avgPrice: "$0.29/KG"
  },
  {
    id: "coffee",
    name: "Arabica Coffee (Kahawa)",
    scientific: "Coffea arabica",
    icon: "☕",
    color: "bg-slate-900 border-orange-500/30 text-orange-300",
    activeColor: "border-orange-400 bg-slate-900 ring-1 ring-orange-400 text-orange-300",
    tags: ["Specialty AA", "Washed Parchment", "Highland Single-Origin"],
    defaultNotes: "Kahawa safi daraja la kwanza, unyevu 11.8%.",
    avgPrice: "$2.80/KG"
  },
  {
    id: "beans",
    name: "Dry Beans (Maharagwe)",
    scientific: "Phaseolus vulgaris",
    icon: "🫘",
    color: "bg-slate-900 border-rose-500/30 text-rose-300",
    activeColor: "border-rose-400 bg-slate-900 ring-1 ring-rose-400 text-rose-300",
    tags: ["Red Speckled", "Zero Weevils", "Standard 50kg Bags"],
    defaultNotes: "Grade 1 clean dry red beans in standardized 50kg bags.",
    avgPrice: "$0.80/KG"
  },
  {
    id: "tomatoes",
    name: "Tomatoes (Nyanya)",
    scientific: "Solanum lypersicum",
    icon: "🍅",
    color: "bg-slate-900 border-red-500/30 text-red-300",
    activeColor: "border-red-400 bg-slate-900 ring-1 ring-red-400 text-red-300",
    tags: ["Fresh Crimson", "Firm Skin", "Cold-Chain FastTrack"],
    defaultNotes: "Nyanya mpya za shambani zimepakiwa kwenye kreti za mbao.",
    avgPrice: "$0.90/KG"
  }
];

const VOLUME_PRESETS = [500, 1000, 2700, 5000, 10000];

const DEPOTS = [
  { id: "bunia", name: "Bunia Depot", region: "Ituri Province, DRC", country: "DRC", flag: "🇨🇩", coords: [1.5667, 30.2500] },
  { id: "goma", name: "Goma Logistics Center", region: "North Kivu, DRC", country: "DRC", flag: "🇨🇩", coords: [-1.6742, 29.2285] },
  { id: "kitale", name: "Kitale Depot", region: "Trans-Nzoia County", country: "Kenya", flag: "🇰🇪", coords: [1.0191, 35.0023] },
  { id: "eldoret", name: "Eldoret Depot", region: "Uasin Gishu County", country: "Kenya", flag: "🇰🇪", coords: [0.5143, 35.2698] },
  { id: "nakuru", name: "Nakuru Depot", region: "Rift Valley Commercial Hub", country: "Kenya", flag: "🇰🇪", coords: [-0.3031, 36.0800] },
  { id: "bukavu", name: "Bukavu Transit Depot", region: "South Kivu, DRC", country: "DRC", flag: "🇨🇩", coords: [-2.5083, 28.8608] },
  { id: "gisenyi", name: "Gisenyi Border Station", region: "Rubavu District", country: "Rwanda", flag: "🇷🇼", coords: [-1.7028, 29.2564] }
];

function DepotMapRecenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, Math.max(map.getZoom(), 7), { animate: true });
    }
  }, [coords, map]);
  return null;
}

function createDepotPinIcon(depot, isSelected) {
  return L.divIcon({
    className: 'custom-depot-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%);">
        <div style="
          width: ${isSelected ? '32px' : '26px'};
          height: ${isSelected ? '32px' : '26px'};
          border-radius: 9999px;
          background: ${isSelected ? '#10B981' : '#0F172A'};
          border: 2px solid ${isSelected ? '#10B981' : '#64748B'};
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? '14px' : '11px'};
        ">
          <span style="font-size: 11px; line-height: 1;">${depot.country === 'DRC' ? '🇨🇩' : depot.country === 'Kenya' ? '🇰🇪' : depot.country === 'Rwanda' ? '🇷🇼' : depot.country === 'Tanzania' ? '🇹🇿' : '🇺🇬'}</span>
        </div>
        <div style="
          background: #0F172A;
          border: 1px solid ${isSelected ? '#10B981' : '#334155'};
          color: ${isSelected ? '#10B981' : '#E2E8F0'};
          font-size: 10px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 6px;
          margin-top: 3px;
          white-space: nowrap;
        ">
          ${depot.name.split(' ')[0]}
        </div>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 22]
  });
}

export default function HarvestCardStack({
  cropOverride,
  setCropOverride,
  volumeOverride,
  setVolumeOverride,
  locationOverride,
  setLocationOverride,
  farmerId,
  setFarmerId,
  notes,
  setNotes,
  imagePreview,
  setImagePreview,
  setImageFile,
  audioName,
  setAudioName,
  audioFile,
  setAudioFile,
  audioPresetUrl,
  setAudioPresetUrl,
  loading,
  onSubmit,
  lang = 'en'
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGpsLocating, setIsGpsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState(null);
  const [showCustomCropDialog, setShowCustomCropDialog] = useState(false);
  const [customCropInput, setCustomCropInput] = useState("");
  const [isImageValidating, setIsImageValidating] = useState(false);
  const [imageValidationError, setImageValidationError] = useState(null);

  const validateImage = async (file) => {
    setIsImageValidating(true);
    setImageValidationError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (cropOverride) formData.append('crop', cropOverride);
      
      const res = await fetch('http://localhost:8000/api/v1/intake/validate-multimodal', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.image_validation && data.image_validation.is_valid_crop === false) {
          setImagePreview(null);
          setImageFile(null);
          setImageValidationError(data.image_validation.rejection_reason || t.imgRejected);
        } else {
          setImageValidationError(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsImageValidating(false);
    }
  };

  const [isAudioValidating, setIsAudioValidating] = useState(false);
  const [audioValidationError, setAudioValidationError] = useState(null);

  const validateAudio = async (file) => {
    setIsAudioValidating(true);
    setAudioValidationError(null);
    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('lang', lang);
      
      const res = await fetch('http://localhost:8000/api/v1/intake/validate-multimodal', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audio_validation && data.audio_validation.is_valid_speech === false) {
          setAudioFile(null);
          setAudioName(null);
          setAudioValidationError(data.audio_validation.rejection_reason || t.audioRejected);
        } else {
          setAudioValidationError(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAudioValidating(false);
    }
  };

  // Selected crop entity
  const selectedCropObj = CROPS.find(c => 
    c.name.toLowerCase().includes(cropOverride?.toLowerCase() || "") ||
    cropOverride?.toLowerCase().includes(c.id)
  ) || CROPS[0];

  const currentVolume = parseFloat(volumeOverride) || 2700;
  const bagCount = Math.ceil(currentVolume / 50);

  // Step names
  const steps = [
    { num: 1, title: "Crop & Commodity", icon: Wheat },
    { num: 2, title: "Volume & Lot Size", icon: Scale },
    { num: 3, title: "Origin Depot", icon: MapPin },
    { num: 4, title: "Multimodal Quality", icon: GeminiIcon },
    { num: 5, title: "Executive Review", icon: ShieldCheck }
  ];

  const handleSelectCrop = (crop) => {
    setCropOverride(crop.name);
    if (!notes) {
      setNotes(crop.defaultNotes);
    }
  };

  const handleSelectVolume = (vol) => {
    setVolumeOverride(vol.toString());
  };

  const handleSelectDepot = (depot) => {
    setLocationOverride(depot.name);
  };

  const handleGpsDetect = () => {
    setIsGpsLocating(true);
    setGpsStatus("Triangulating field telemetry via GPS satellites...");
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsGpsLocating(false);
          // Pick closest regional depot or standard
          const chosen = DEPOTS[0];
          setLocationOverride(chosen.name);
          setGpsStatus(`GPS Acquired: ${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}° (${chosen.name})`);
        },
        () => {
          setTimeout(() => {
            setIsGpsLocating(false);
            const chosen = DEPOTS[0];
            setLocationOverride(chosen.name);
            setGpsStatus(`GPS Triangulated: Bunia Agro-Terminal, DRC (Lat 1.5667°, Lon 30.2500°)`);
          }, 600);
        },
        { timeout: 3000 }
      );
    } else {
      setTimeout(() => {
        setIsGpsLocating(false);
        const chosen = DEPOTS[0];
        setLocationOverride(chosen.name);
        setGpsStatus(`GPS Triangulated: ${chosen.name}`);
      }, 600);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return Boolean(cropOverride || selectedCropObj);
    if (currentStep === 2) return currentVolume > 0;
    if (currentStep === 3) return Boolean(locationOverride || DEPOTS[0].name);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !cropOverride) {
      setCropOverride(CROPS[0].name);
    }
    if (currentStep === 2 && !volumeOverride) {
      setVolumeOverride("2700");
    }
    if (currentStep === 3 && !locationOverride) {
      setLocationOverride(DEPOTS[0].name);
    }
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Progress & Step Bar */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-3 sm:p-4 backdrop-blur-md ">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {steps.map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            const Icon = s.icon;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-500 text-slate-950'
                    : isCompleted
                    ? 'bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-slate-800'
                    : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isCurrent ? 'bg-slate-950 text-emerald-400' : isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Icon className="w-3 h-3" />}
                </div>
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.title.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Linear Progress Indicator */}
        <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Active Step Card */}
      <div className="rounded-3xl bg-[#0F172A]/95 border border-slate-800 p-5 sm:p-7  relative overflow-hidden space-y-6">
        
        {/* Step 1: Crop & Commodity */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div>
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Wheat className="w-4 h-4" />
                <span>Step 1 of 5 • Commodity Classification</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Select Your Harvested Crop
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                KilimoAgent will calibrate regional spot market arbitrage models for this commodity.
              </p>
            </div>

            {/* Crop Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CROPS.map((crop) => {
                const isSelected = (cropOverride || "Maize (Mahindi)").toLowerCase().includes(crop.id) ||
                  (cropOverride || "").toLowerCase().includes(crop.name.toLowerCase());

                return (
                  <div
                    key={crop.id}
                    onClick={() => handleSelectCrop(crop)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? `${crop.activeColor} `
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{crop.icon}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 border border-slate-800 text-emerald-400 font-mono">
                        {crop.avgPrice}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-white text-base leading-tight">
                        {crop.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 italic">
                        {crop.scientific}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {crop.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-900/90 text-slate-300 border border-slate-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* 6th Card: Custom / Other Harvest Commodity */}
              <div
                onClick={() => {
                  setCustomCropInput(!CROPS.some(c => (cropOverride || '').toLowerCase().includes(c.id)) ? cropOverride || "" : "");
                  setShowCustomCropDialog(true);
                }}
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                  !CROPS.some(c => (cropOverride || '').toLowerCase().includes(c.id)) && cropOverride
                    ? 'bg-slate-900 border-amber-400 ring-1 ring-amber-400 '
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">➕</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 border border-amber-400/40 text-amber-300 font-mono">
                    {lang === 'sw' ? "Zao Huria" : lang === 'fr' ? "Sur-mesure" : "Custom Spec"}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">
                    {lang === 'sw' ? "Zao Lingine / Maalum" : lang === 'fr' ? "Autre Récolte / Personnalisée" : "Custom / Other Crop"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'sw' ? "Bofya kuingiza zao lolote la kilimo" : lang === 'fr' ? "Cliquez pour saisir n'importe quelle culture" : "Click to enter any agricultural commodity"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {lang === 'sw' ? "Sorgho, Soya, Pamba..." : lang === 'fr' ? "Sorgho, Soja, Coton..." : "Sorghum, Soya, Cotton..."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Volume & Lot Size */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div>
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Scale className="w-4 h-4" />
                <span>Step 2 of 5 • Batch Sizing & Logistics</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Declared Volume & Lot Size
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Choose a preset lot or specify custom tonnage for automated carrier fleet assignment.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Quick Preset Pills:
              </label>
              <div className="flex flex-wrap gap-2">
                {VOLUME_PRESETS.map((vol) => {
                  const isSelected = parseFloat(volumeOverride) === vol || (!volumeOverride && vol === 2700);
                  return (
                    <button
                      key={vol}
                      type="button"
                      onClick={() => handleSelectVolume(vol)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {vol.toLocaleString()} KG ({(vol / 1000).toFixed(1)} MT)
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Input Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {lang === 'sw' ? "Uzito Maalum (Kilogramu):" : lang === 'fr' ? "Poids Personnalisé (Kilogrammes) :" : "Custom Weight (Kilograms):"}
              </label>
              <div className="relative max-w-sm">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={volumeOverride || "2700"}
                  onChange={(e) => setVolumeOverride(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="2700"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pr-16 font-mono"
                />
                <span className="absolute right-4 top-3.5 text-xs font-black text-slate-500 pointer-events-none">
                  KG
                </span>
              </div>
            </div>

            {/* Dynamic Logistics Projection Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">{t.standardBags}</div>
                  <div className="text-base font-extrabold text-amber-300">{bagCount} × 50kg Bags</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">{t.carrierTier}</div>
                  <div className="text-xs font-extrabold text-white">
                    {currentVolume <= 1000 ? "1.0 MT Light Pickup" : currentVolume <= 3500 ? "3.5 MT Isuzu Canter" : "10 MT Lorry Freight"}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Est. Spot Value</div>
                  <div className="text-base font-extrabold text-emerald-400">
                    ${(currentVolume * 0.45).toFixed(2)} USD
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Origin Depot */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  <span>Step 3 of 5 • Origin & Geolocation</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                  Designate Collection Depot
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {translations[lang]?.clickToSelectDepot || "Click any collection depot on the map or select from the list below."}
                </p>
              </div>

              {/* GPS Auto-Detect Button */}
              <button
                type="button"
                onClick={handleGpsDetect}
                disabled={isGpsLocating}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0"
              >
                <LocateFixed className={`w-4 h-4 text-emerald-400 ${isGpsLocating ? 'animate-spin' : ''}`} />
                <span>{isGpsLocating ? 'Locating...' : 'Auto-Detect GPS Location'}</span>
              </button>
            </div>

            {gpsStatus && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{gpsStatus}</span>
              </div>
            )}

            {/* Interactive Mini Leaflet Map for Depot Selection */}
            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950  relative">
              <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center space-x-2 font-bold text-emerald-400">
                  <Map className="w-3.5 h-3.5" />
                  <span>Interactive Regional Depot Map</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {locationOverride || "Bunia Depot"}
                </span>
              </div>

              <div className="h-56 sm:h-64 w-full relative z-0">
                <MapContainer
                  center={
                    DEPOTS.find(d => 
                      d.name.toLowerCase().includes(locationOverride?.toLowerCase() || "") ||
                      (locationOverride || "").toLowerCase().includes(d.id)
                    )?.coords || [0.2, 32.5]
                  }
                  zoom={6}
                  scrollWheelZoom={false}
                  className="w-full h-full"
                  style={{ background: "#090D16" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    maxZoom={18}
                  />

                  <DepotMapRecenter
                    coords={
                      DEPOTS.find(d => 
                        d.name.toLowerCase().includes(locationOverride?.toLowerCase() || "") ||
                        (locationOverride || "").toLowerCase().includes(d.id)
                      )?.coords || [0.2, 32.5]
                    }
                  />

                  {DEPOTS.map((depot) => {
                    const isSelected = (locationOverride || "Bunia Depot").toLowerCase().includes(depot.id) ||
                      (locationOverride || "").toLowerCase().includes(depot.name.toLowerCase());

                    return (
                      <Marker
                        key={depot.id}
                        position={depot.coords}
                        icon={createDepotPinIcon(depot, isSelected)}
                        eventHandlers={{
                          click: () => handleSelectDepot(depot)
                        }}
                      >
                        <Popup className="dark-leaflet-popup">
                          <div className="p-2.5 bg-slate-900 text-slate-100 rounded-xl border border-emerald-500/40 text-xs">
                            <div className="font-black text-emerald-400 flex items-center space-x-2">
                              <CountryFlag country={depot.country} className="w-5 h-3.5" />
                              <span>{depot.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{depot.region}</p>
                            <button
                              type="button"
                              onClick={() => handleSelectDepot(depot)}
                              className="mt-2 w-full py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] hover:bg-emerald-400 transition"
                            >
                              {isSelected ? "Selected Pickup Point" : "Select Depot"}
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </div>

            {/* Depot Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEPOTS.map((depot) => {
                const isSelected = (locationOverride || "Bunia Depot").toLowerCase().includes(depot.id) ||
                  (locationOverride || "").toLowerCase().includes(depot.name.toLowerCase());

                return (
                  <div
                    key={depot.id}
                    onClick={() => handleSelectDepot(depot)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 ring-2 '
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <CountryFlag country={depot.country} className="w-8 h-5.5 rounded-sm " />
                      <div>
                        <h4 className="font-extrabold text-white text-sm">{depot.name}</h4>
                        <p className="text-[11px] text-slate-400">{depot.region}</p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Multimodal Enhancements */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div>
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <GeminiIcon className="w-4 h-4" />
                <span>Step 4 of 5 • Multimodal Quality Verification</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Attach Visual & Voice Evidence (Optional)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Gemini 3.6 Flash uses multimodal inspection to verify grain quality grades and eliminate middlemen disputes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Photo / Camera Inspection Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-extrabold text-white">Visual Quality Photo</span>
                  </div>
                  {imagePreview && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      ATTACHED
                    </span>
                  )}
                </div>

                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-800 bg-slate-900 group">
                    <img src={imagePreview} alt="Harvest Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(null); setImageFile(null); }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/90 text-rose-300 border border-rose-500/40 text-[10px] font-bold hover:bg-rose-500 hover:text-white transition cursor-pointer"
                    >
                      Remove
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      Moisture: ~12.2% • Grade A Verified
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition">
                      <Camera className="w-8 h-8 text-slate-500 mb-2" />
                      <span className="text-xs font-bold text-slate-300">Upload Harvest Photo</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">JPEG, PNG or Camera Shot</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                            validateImage(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    {isImageValidating && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-bold flex items-center justify-center space-x-2">
                        <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        <span>Validating Agricultural Crop...</span>
                      </div>
                    )}
                    
                    {imageValidationError && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-rose-500/30 text-xs text-rose-400 flex flex-col space-y-2">
                        <div className="flex items-center space-x-2 font-bold">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{imageValidationError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImageValidationError(null)}
                          className="self-start px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[10px] font-bold transition"
                        >
                          Retake Photo
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview("/samples/sample_maize.jpg");
                        setImageValidationError(null);
                      }}
                      className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-bold transition cursor-pointer"
                    >
                      Use Sample Grade A Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Spoken Voice Note Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Mic className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-extrabold text-white">Farmer Voice Note</span>
                  </div>
                  {(audioName || audioFile || audioPresetUrl) && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      AUDIO ATTACHED
                    </span>
                  )}
                </div>

                {(audioName || audioFile || audioPresetUrl) ? (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 truncate max-w-[180px]">
                        {audioName || "Live Recorded Voice Note"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAudioFile(null);
                          setAudioName(null);
                          setAudioPresetUrl(null);
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 italic">
                      "Swahili / Vernacular dialect transcription armed"
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition">
                      <Mic className="w-8 h-8 text-slate-500 mb-2" />
                      <span className="text-xs font-bold text-slate-300">Upload Voice Recording</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">MP3, WAV, M4A or Vernacular Note</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setAudioFile(file);
                            setAudioName(file.name);
                            validateAudio(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    {isAudioValidating && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-400 font-bold flex items-center justify-center space-x-2">
                        <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        <span>Validating Voice Note...</span>
                      </div>
                    )}
                    
                    {audioValidationError && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-rose-500/30 text-xs text-rose-400 flex flex-col space-y-2">
                        <div className="flex items-center space-x-2 font-bold">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{audioValidationError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAudioValidationError(null)}
                          className="self-start px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[10px] font-bold transition"
                        >
                          Record Again
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setAudioPresetUrl("/samples/sample_voice.mp4");
                        setAudioName("sample_voice.mp4 (Swahili Voice Note)");
                        setAudioValidationError(null);
                      }}
                      className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-bold transition cursor-pointer"
                    >
                      Attach Sample Swahili Voice Note
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Skip Hint */}
            <div className="text-center text-[11px] text-slate-500">
              * Multimodal files are optional. You can proceed directly to the Executive Review.
            </div>
          </div>
        )}

        {/* Step 5: Executive Review & Launch */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div>
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Step 5 of 5 • Executive Dispatch Review</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Review & Launch Kilimo Agent
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Verify parameters before triggering the dual-model autonomous arbitrage pipeline.
              </p>
            </div>

            {/* Review Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Selected Crop</div>
                <div className="text-base font-extrabold text-white flex items-center space-x-2">
                  <span>{selectedCropObj.icon}</span>
                  <span>{cropOverride || selectedCropObj.name}</span>
                </div>
                <div className="text-[11px] text-emerald-400 font-bold">Grade A Standard Certified</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Verified {t.lotVolumeLabel}</div>
                <div className="text-base font-extrabold text-amber-300">
                  {currentVolume.toLocaleString()} KG
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {bagCount} × 50kg Bags ({(currentVolume / 1000).toFixed(2)} Metric Tonnes)
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">{t.originDepotLabel}</div>
                <div className="text-base font-extrabold text-white">
                  {locationOverride || DEPOTS[0].name}
                </div>
                <div className="text-[11px] text-cyan-300 font-medium">
                  Assigned Route: Great Lakes Agricultural Corridor
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Multimodal Payload</div>
                <div className="text-base font-extrabold text-emerald-400 flex items-center space-x-2">
                  <span>{imagePreview ? '📷 Photo' : '📝 Spec'}</span>
                  <span>+</span>
                  <span>{audioName || audioFile || audioPresetUrl ? '🎙️ Voice Note' : '⚡ Direct Spec'}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  Security Armor: Gemma 2 9B-IT Sanitized
                </div>
              </div>
            </div>

            {/* Launch Agent Action Bar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base tracking-wide transition-all duration-150 flex items-center justify-center space-x-3 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Executing Dual-Model Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    <span>Launch Kilimo Agent</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step Navigation Controls (Back / Next) */}
        <div className="flex items-center justify-between border-t border-slate-800/90 pt-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentStep === 1
                ? 'opacity-30 cursor-not-allowed text-slate-600'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-xs text-slate-500 font-bold">
            Step {currentStep} of 5
          </div>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition cursor-pointer active:scale-95"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Custom Crop Dialog Modal */}
      {showCustomCropDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl max-w-md w-full p-6  space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Wheat className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {lang === 'sw' ? "Weka Zao Lako la Kilimo" : lang === 'fr' ? "Saisir une Culture Personnalisée" : "Enter Custom Crop Commodity"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'sw' ? "Bainisha zao lolote la kilimo" : lang === 'fr' ? "Précisez votre production agricole" : "Specify any agricultural harvest"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomCropDialog(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  {lang === 'sw' ? "Jina la Zao :" : lang === 'fr' ? "Nom de la culture :" : "Crop Commodity Name:"}
                </label>
                <input
                  type="text"
                  value={customCropInput}
                  onChange={(e) => setCustomCropInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customCropInput.trim()) {
                      setCropOverride(customCropInput.trim());
                      setShowCustomCropDialog(false);
                      setCurrentStep(2);
                    }
                  }}
                  placeholder={lang === 'sw' ? "k.m. Mtama, Alizeti, Soya, Parachichi..." : lang === 'fr' ? "ex. Sorgho, Soja, Tournesol, Avocat..." : "e.g. Sorghum, Soya, Sunflower, Avocado..."}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>

              {/* Quick Preset Pills */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase">
                  {lang === 'sw' ? "Mifano ya Haraka:" : lang === 'fr' ? "Suggestions rapides :" : "Quick Suggestions:"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(lang === 'sw'
                    ? ["Mtama", "Alizeti", "Soya", "Parachichi", "Mchele", "Ufuta", "Ngano"]
                    : lang === 'fr'
                    ? ["Sorgho", "Soja", "Tournesol", "Avocat", "Riz", "Sésame", "Blé"]
                    : ["Sorghum", "Soya", "Sunflower", "Avocado", "Rice", "Sesame", "Wheat"]
                  ).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCustomCropInput(item)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-400/50 text-[11px] font-bold text-slate-300 hover:text-amber-300 transition cursor-pointer"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCustomCropDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                {lang === 'sw' ? "Ghairi" : lang === 'fr' ? "Annuler" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customCropInput.trim()) {
                    setCropOverride(customCropInput.trim());
                    setShowCustomCropDialog(false);
                    setCurrentStep(2);
                  }
                }}
                disabled={!customCropInput.trim()}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 text-xs font-black transition cursor-pointer"
              >
                {lang === 'sw' ? "Thibitisha Zao" : lang === 'fr' ? "Confirmer la Culture" : "Confirm Crop"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
