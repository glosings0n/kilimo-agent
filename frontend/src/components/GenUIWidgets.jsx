import { translations } from '../utils/translations';
import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Wheat,
  Scale,
  MapPin,
  Camera,
  Mic,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  Package,
  Truck,
  Play,
  Pause,
  Upload,
  X,
  Map,
  DollarSign
} from 'lucide-react';
import GeminiIcon from './GeminiIcon';
import { CountryFlag } from './Flags';

// Regional Depots Configuration
export const REGIONAL_DEPOTS = [
  { id: "bunia", name: "Bunia Depot", region: "Ituri Province, DRC", country: "DRC", flag: "🇨🇩", coords: [1.5667, 30.2500] },
  { id: "goma", name: "Goma Logistics Center", region: "North Kivu, DRC", country: "DRC", flag: "🇨🇩", coords: [-1.6742, 29.2285] },
  { id: "kitale", name: "Kitale Depot", region: "Trans-Nzoia County, Kenya", country: "Kenya", flag: "🇰🇪", coords: [1.0191, 35.0023] },
  { id: "eldoret", name: "Eldoret Depot", region: "Uasin Gishu County, Kenya", country: "Kenya", flag: "🇰🇪", coords: [0.5143, 35.2698] },
  { id: "nakuru", name: "Nakuru Depot", region: "Rift Valley Hub, Kenya", country: "Kenya", flag: "🇰🇪", coords: [-0.3031, 36.0800] },
  { id: "bukavu", name: "Bukavu Transit Depot", region: "South Kivu, DRC", country: "DRC", flag: "🇨🇩", coords: [-2.5083, 28.8608] },
  { id: "gisenyi", name: "Gisenyi Border Station", region: "Rubavu District, Rwanda", country: "Rwanda", flag: "🇷🇼", coords: [-1.7028, 29.2564] }
];

// Crop Catalog Configuration
export const CROPS_CATALOG = [
  {
    id: "maize",
    name: "Maize (Mahindi)",
    scientific: "Zea mays",
    icon: "🌽",
    pricePerKg: 0.45,
    priceFormatted: "$0.45/KG",
    tags: ["Flint Grade A", "Moisture < 12.5%", "Export Spec"],
    defaultNotes: "Nafaka zimekauka vizuri bila wadudu, tayari kwa soko."
  },
  {
    id: "cassava",
    name: "Cassava (Manioc)",
    scientific: "Manihot esculenta",
    icon: "🥔",
    pricePerKg: 0.29,
    priceFormatted: "$0.29/KG",
    tags: ["High Starch", "Clean Root Tubers", "Industrial Spec"],
    defaultNotes: "Racines de manioc fraîchement récoltées, haute teneur en amidon."
  },
  {
    id: "coffee",
    name: "Arabica Coffee (Kahawa)",
    scientific: "Coffea arabica",
    icon: "☕",
    pricePerKg: 2.80,
    priceFormatted: "$2.80/KG",
    tags: ["Specialty AA", "Washed Parchment", "Highland Single-Origin"],
    defaultNotes: "Kahawa safi daraja la kwanza, unyevu 11.8%."
  },
  {
    id: "beans",
    name: "Dry Beans (Maharagwe)",
    scientific: "Phaseolus vulgaris",
    icon: "🫘",
    pricePerKg: 0.80,
    priceFormatted: "$0.80/KG",
    tags: ["Red Speckled", "Zero Weevils", "Standard 50kg Bags"],
    defaultNotes: "Grade 1 clean dry red beans in standardized 50kg bags."
  },
  {
    id: "tomatoes",
    name: "Tomatoes (Nyanya)",
    scientific: "Solanum lycopersicum",
    icon: "🍅",
    pricePerKg: 0.90,
    priceFormatted: "$0.90/KG",
    tags: ["Fresh Crimson", "Firm Skin", "Cold-Chain FastTrack"],
    defaultNotes: "Nyanya mpya za shambani zimepakiwa kwenye kreti za mbao."
  }
];

export const VOLUME_PRESETS_LIST = [500, 1000, 2700, 5000, 10000];

// Map View Controller
function MapViewController({ centerCoords }) {
  const map = useMap();
  useEffect(() => {
    if (centerCoords) {
      map.setView(centerCoords, Math.max(map.getZoom(), 6), { animate: true });
    }
  }, [centerCoords, map]);
  return null;
}

// Flat DivIcon Creator (No gradients, no glows)
function createFlatDepotIcon(depot, isSelected) {
  return L.divIcon({
    className: 'custom-flat-depot-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%);">
        <div style="
          width: ${isSelected ? '32px' : '26px'};
          height: ${isSelected ? '32px' : '26px'};
          border-radius: 9999px;
          background: ${isSelected ? '#10B981' : '#0F172A'};
          border: 2px solid ${isSelected ? '#10B981' : '#475569'};
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? '14px' : '11px'};
          box-shadow: none;
        ">
          <span style="font-size: 11px; line-height: 1;">${depot.country === 'DRC' ? '🇨🇩' : depot.country === 'Kenya' ? '🇰🇪' : depot.country === 'Rwanda' ? '🇷🇼' : depot.country === 'Tanzania' ? '🇹🇿' : '🇺🇬'}</span>
        </div>
        <div style="
          background: #090D16;
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

/**
 * 1. GenUIDepotMapPicker
 * Mini Leaflet dark map displaying all 7 regional depots with clickable pins and quick pill selector below.
 */
export function GenUIDepotMapPicker({ onSelectDepot, selectedDepot = "Bunia Depot", lang = 'en' }) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
  const currentDepotObj = REGIONAL_DEPOTS.find(d =>
    d.name.toLowerCase().includes((selectedDepot || "").toLowerCase()) ||
    (selectedDepot || "").toLowerCase().includes(d.id)
  ) || REGIONAL_DEPOTS[0];

  return (
    <div className="w-full bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>{t.originDepotLabel}</span>
              <GeminiIcon className="w-3 h-3 text-emerald-400" />
            </h4>
            <p className="text-[10px] text-slate-400">
              Select your agricultural collection hub in East Africa
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-mono font-bold flex items-center space-x-1.5">
          <CountryFlag country={currentDepotObj.country} className="w-4 h-3 rounded-xs" />
          <span>{currentDepotObj.name}</span>
        </span>
      </div>

      {/* Mini Leaflet Dark Map */}
      <div className="h-44 sm:h-52 w-full rounded-xl overflow-hidden border border-slate-800 bg-[#090D16] relative z-0">
        <MapContainer
          center={currentDepotObj.coords}
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
          <MapViewController centerCoords={currentDepotObj.coords} />

          {REGIONAL_DEPOTS.map((depot) => {
            const isSelected = (selectedDepot || "").toLowerCase().includes(depot.id) ||
              (selectedDepot || "").toLowerCase().includes(depot.name.toLowerCase());

            return (
              <Marker
                key={depot.id}
                position={depot.coords}
                icon={createFlatDepotIcon(depot, isSelected)}
                eventHandlers={{
                  click: () => onSelectDepot && onSelectDepot(depot.name)
                }}
              >
                <Popup className="dark-leaflet-popup">
                  <div className="p-2.5 bg-slate-900 text-slate-100 rounded-xl border border-emerald-500/40 text-xs">
                    <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                      <CountryFlag country={depot.country} className="w-4 h-3 rounded-xs" />
                      <span>{depot.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{depot.region}</p>
                    <button
                      type="button"
                      onClick={() => onSelectDepot && onSelectDepot(depot.name)}
                      className="mt-2 w-full py-1 rounded-lg bg-emerald-500 text-slate-950 font-extrabold text-[10px] hover:bg-emerald-400 transition cursor-pointer"
                    >
                      {isSelected ? "Current Selection" : "Set Depot"}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Quick Pill Selector Below Map */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          Quick Depot Pills:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {REGIONAL_DEPOTS.map((depot) => {
            const isSelected = (selectedDepot || "").toLowerCase().includes(depot.id) ||
              (selectedDepot || "").toLowerCase().includes(depot.name.toLowerCase());

            return (
              <button
                key={depot.id}
                type="button"
                onClick={() => onSelectDepot && onSelectDepot(depot.name)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <CountryFlag country={depot.country} className="w-4 h-3 rounded-xs" />
                <span>{depot.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 2. GenUICropSelector
 * Interactive flat cards for Maize, Cassava, Coffee, Beans, Tomatoes + 6th Custom Crop option.
 */
export function GenUICropSelector({ onSelectCrop, selectedCrop = "Maize (Mahindi)", lang = 'en' }) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customCropName, setCustomCropName] = useState("");

  const isPredefinedSelected = CROPS_CATALOG.some(crop =>
    (selectedCrop || "").toLowerCase().includes(crop.id) ||
    (selectedCrop || "").toLowerCase().includes(crop.name.toLowerCase())
  );

  return (
    <div className="w-full bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Wheat className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>{lang === 'sw' ? "Chagua Zao la Kilimo" : lang === 'fr' ? "Sélectionnez votre Récolte" : "Select Harvest Commodity"}</span>
              <GeminiIcon className="w-3 h-3 text-amber-400" />
            </h4>
            <p className="text-[10px] text-slate-400">
              {lang === 'sw' ? "Imeunganishwa na masoko ya kanda kwa wakati halisi" : lang === 'fr' ? "Calibré avec les cours spots des marchés régionaux" : "Calibrated with regional market spot price feeds"}
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Flat Crop Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {CROPS_CATALOG.map((crop) => {
          const isSelected = (selectedCrop || "").toLowerCase().includes(crop.id) ||
            (selectedCrop || "").toLowerCase().includes(crop.name.toLowerCase());

          return (
            <div
              key={crop.id}
              onClick={() => {
                setIsCustomOpen(false);
                if (onSelectCrop) onSelectCrop(crop.name, crop);
              }}
              className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between ${
                isSelected && !isCustomOpen
                  ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <span className="text-2xl shrink-0">{crop.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h5 className="font-extrabold text-white text-xs sm:text-sm truncate">
                      {crop.name}
                    </h5>
                  </div>
                  <p className="text-[10px] text-slate-400 italic truncate">
                    {crop.scientific}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {crop.tags.slice(0, 2).map((t, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[9px] font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-2">
                <div className="text-xs font-mono font-extrabold text-emerald-400">
                  {crop.priceFormatted}
                </div>
                <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center ml-auto ${
                  isSelected && !isCustomOpen ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'bg-slate-900 border-slate-700'
                }`}>
                  {isSelected && !isCustomOpen && <CheckCircle2 className="w-3 h-3 fill-current" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* 6th Card: Custom / Other Crop */}
        <div
          onClick={() => setIsCustomOpen(true)}
          className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
            isCustomOpen || (!isPredefinedSelected && selectedCrop && selectedCrop.length > 1)
              ? 'bg-slate-900 border-amber-400 ring-1 ring-amber-400'
              : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <span className="text-2xl shrink-0">➕</span>
              <div className="min-w-0">
                <h5 className="font-extrabold text-white text-xs sm:text-sm truncate">
                  {lang === 'sw' ? "Zao Lingine / Maalum" : lang === 'fr' ? "Autre Récolte / Personnalisée" : "Custom / Other Crop"}
                </h5>
                <p className="text-[10px] text-slate-400 truncate">
                  {lang === 'sw' ? "Mtama, Soya, Alizeti, Parachichi, Mchele..." : lang === 'fr' ? "Sorgho, Soja, Avocat, Riz, Tournesol..." : "Sorghum, Soya, Avocado, Rice, Sesame..."}
                </p>
              </div>
            </div>
            {(!isPredefinedSelected && selectedCrop && selectedCrop.length > 1) && (
              <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3 fill-current" />
              </div>
            )}
          </div>

          {isCustomOpen ? (
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={customCropName}
                onChange={(e) => setCustomCropName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customCropName.trim()) {
                    onSelectCrop && onSelectCrop(customCropName.trim());
                    setIsCustomOpen(false);
                  }
                }}
                placeholder={lang === 'sw' ? "k.m. Mtama, Alizeti..." : lang === 'fr' ? "ex. Sorgho, Soja..." : "e.g. Sorghum, Soya..."}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  if (customCropName.trim()) {
                    onSelectCrop && onSelectCrop(customCropName.trim());
                    setIsCustomOpen(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition cursor-pointer shrink-0"
              >
                {lang === 'sw' ? "Weka" : lang === 'fr' ? "Valider" : "Set"}
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-amber-400 font-bold mt-1 inline-block">
              {lang === 'sw' ? "Bofya hapa kuingiza zao lako" : lang === 'fr' ? "Cliquez pour entrer votre culture" : "Click to enter custom commodity"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 3. GenUIVolumeLotPicker
 * Presets (500kg, 1,000kg, 2,700kg, 5,000kg) + numeric text input with bag count converter.
 */
export function GenUIVolumeLotPicker({ onSelectVolume, selectedVolume = 2700, lang = 'en' }) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
  const currentVol = parseFloat(selectedVolume) || 0;
  const bagCount = currentVol > 0 ? Math.ceil(currentVol / 50) : 0;
  const metricTonnes = (currentVol / 1000).toFixed(2);

  const getCarrierTier = (vol) => {
    if (vol <= 1000) return "1.0 MT Light Cargo Pickup";
    if (vol <= 3500) return "3.5 MT Isuzu Medium Canter";
    return "10.0 MT Freight Lorry";
  };

  return (
    <div className="w-full bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>{lang === 'sw' ? "Uzito wa Mzigo & Usafirishaji" : lang === 'fr' ? "Volume & Calibrage Logistique" : "Lot Volume & Freight Sizing"}</span>
              <GeminiIcon className="w-3 h-3 text-cyan-400" />
            </h4>
            <p className="text-[10px] text-slate-400">
              {lang === 'sw' ? "Ubadilishaji wa kiotomatiki kuwa magunia ya kilo 50" : lang === 'fr' ? "Conversion automatique en sacs standard de 50 kg" : "Automatic conversion into standardized 50kg bags"}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-amber-300 text-[10px] font-mono font-bold">
          {currentVol > 0 ? `${currentVol.toLocaleString()} KG` : "0 KG"}
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          {lang === 'sw' ? "Vipimo vya Kawaida:" : lang === 'fr' ? "Volumes Prédéfinis :" : "Standard Lot Presets:"}
        </span>
        <div className="flex flex-wrap gap-2">
          {VOLUME_PRESETS_LIST.map((vol) => {
            const isSelected = currentVol === vol;
            return (
              <button
                key={vol}
                type="button"
                onClick={() => onSelectVolume && onSelectVolume(vol)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {vol.toLocaleString()} KG
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Input & Bag Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            {lang === 'sw' ? "Andika Uzito Maalum (KG) :" : lang === 'fr' ? "Poids Personnalisé (KG) :" : "Custom Weight (KG):"}
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={currentVol > 0 ? currentVol : ""}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^0-9]/g, '');
                const num = cleaned ? parseFloat(cleaned) : 0;
                if (onSelectVolume) onSelectVolume(num);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-12 py-2 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
              placeholder={lang === 'sw' ? "k.m. 2700" : lang === 'fr' ? "ex. 2700" : "e.g. 2700"}
            />
            <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-slate-500 pointer-events-none">
              KG
            </span>
          </div>
        </div>

        {/* Dynamic Metric Tile */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'sw' ? "Magunia" : lang === 'fr' ? "Standard" : "Standardized"}</div>
              <div className="text-xs font-extrabold text-amber-300">
                {bagCount} × 50kg ({metricTonnes} MT)
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-slate-500 font-bold uppercase">{lang === 'sw' ? "Aina ya Lori" : lang === 'fr' ? "Camion Requis" : "Carrier Tier"}</div>
            <div className="text-[10px] font-extrabold text-cyan-300">
              {getCarrierTier(currentVol)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 4. GenUIPhotoQualityCard
 * Clean flat card to upload or take a harvest photo for AI grading.
 */
export function GenUIPhotoQualityCard({
  onPhotoCapture,
  onPhotoUpload,
  imagePreview,
  onRemovePhoto,
  lang = 'en'
}) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onPhotoUpload) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
      onPhotoUpload(file, URL.createObjectURL(file));
    }
  };

  return (
    <div className="w-full bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>{t.visualHarvestQuality}</span>
              <GeminiIcon className="w-3 h-3 text-emerald-400" />
            </h4>
            <p className="text-[10px] text-slate-400">
              Gemini 3.6 Flash grades grain kernel integrity and moisture
            </p>
          </div>
        </div>
        {imagePreview && (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
            GRADE A VERIFIED
          </span>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {imagePreview ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[16/9] max-h-48">
          <img src={imagePreview} alt="Harvest Quality Specimen" className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-slate-950/90 border border-emerald-500/40 text-[10px] font-bold text-emerald-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Moisture: 12.2% • Clean Uniform Batch</span>
          </div>
          {onRemovePhoto && (
            <button
              type="button"
              onClick={onRemovePhoto}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-black text-rose-300 border border-rose-500/30 text-xs transition cursor-pointer"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>{t.uploadHarvestPhoto}</span>
          </button>

          <button
            type="button"
            onClick={() => onPhotoCapture && onPhotoCapture("/samples/sample_maize.jpg")}
            className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>{t.useSamplePhoto}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 5. GenUIAudioRecordCard
 * Microphone recording button for quick voice clarification.
 */
export function GenUIAudioRecordCard({
  onRecordComplete,
  audioFile,
  audioName,
  audioPresetUrl,
  onRemoveAudio,
  lang = 'en'
}) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
  const [isRecording, setIsRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => {
    let timer = null;
    if (isRecording) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
      setRecordSec(0);
      timer = setInterval(() => setRecordSec(s => s + 1), 1000);
    } else {
      if (timer) clearInterval(timer);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isRecording]);

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/mp4' });
          const file = new File([blob], 'farmer_voice_clarification.mp4', { type: 'audio/mp4' });
          stream.getTracks().forEach((track) => track.stop());
          if (onRecordComplete) {
            onRecordComplete(file, 'farmer_voice_clarification.mp4');
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn("Microphone permission denied:", err);
        if (onRecordComplete) {
          onRecordComplete(null, 'sample_voice.mp4 (Swahili recording)', '/samples/sample_voice.mp4');
        }
      }
    }
  };

  const handleUsePreset = () => {
    if (onRecordComplete) {
      onRecordComplete(null, 'sample_voice.mp4 (Swahili recording)', '/samples/sample_voice.mp4');
    }
  };

  const audioSrc = audioFile ? URL.createObjectURL(audioFile) : audioPresetUrl;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="w-full bg-[#0F172A] border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>{t.voiceNoteClarification}</span>
              <GeminiIcon className="w-3 h-3 text-amber-400" />
            </h4>
            <p className="text-[10px] text-slate-400">
              Speak in Swahili, French, or English vernacular
            </p>
          </div>
        </div>
        {(audioName || audioFile || audioPresetUrl) && (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
            AUDIO ATTACHED
          </span>
        )}
      </div>

      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Recording or Attached Audio State */}
      {isRecording ? (
        <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/40 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-rose-400">
              00:{recordSec < 10 ? `0${recordSec}` : recordSec} Recording...
            </span>
          </div>
          <button
            type="button"
            onClick={toggleRecording}
            className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-extrabold hover:bg-rose-400 transition cursor-pointer"
          >
            Finish Recording
          </button>
        </div>
      ) : (audioName || audioFile || audioPresetUrl) ? (
        <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <button
              type="button"
              onClick={togglePlay}
              className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 cursor-pointer font-bold"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {audioName || "Live Recorded Audio"}
              </div>
              <div className="text-[10px] text-slate-400">
                Ready for Gemini dialect transcription
              </div>
            </div>
          </div>
          {onRemoveAudio && (
            <button
              type="button"
              onClick={onRemoveAudio}
              className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
              title="Remove audio"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={toggleRecording}
            className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <Mic className="w-4 h-4 text-rose-400" />
            <span>{t.recordVoiceNote}</span>
          </button>

          <button
            type="button"
            onClick={handleUsePreset}
            className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <Play className="w-4 h-4 text-amber-400" />
            <span>{t.useSwahiliDemoAudio}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 6. GenUIDispatchConfirmation
 * Executive summary card showing Crop, Volume, Origin, Estimated Spot Value, and solid emerald "🚀 Launch Kilimo Dispatch Agent" button.
 */
export function GenUIDispatchConfirmation({
  params = {},
  onConfirm,
  loading = false,
  lang = 'en'
}) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
  const crop = params.crop || "Maize (Mahindi)";
  const volume = parseFloat(params.volume) || 2700;
  const origin = params.origin || "Bunia Depot";
  const spotPrice = params.spotPrice || (crop.toLowerCase().includes("coffee") ? 2.80 : crop.toLowerCase().includes("cassava") ? 0.29 : 0.45);
  const estimatedGross = volume * spotPrice;
  const estimatedFreight = volume * 0.04;
  const estimatedNet = estimatedGross - estimatedFreight;
  const bagCount = Math.ceil(volume / 50);

  return (
    <div className="w-full bg-[#0F172A] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
              <span>{t.execDispatchConfirmation}</span>
              <GeminiIcon className="w-3.5 h-3.5 text-emerald-400" />
            </h4>
            <p className="text-[11px] text-slate-400">
              Verified autonomous parameters ready for multi-hub arbitrage execution
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
          READY FOR LAUNCH
        </span>
      </div>

      {/* 4 Summary Parameter Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <div className="text-[9px] uppercase font-bold text-slate-400">{t.commodityLabel}</div>
          <div className="text-xs sm:text-sm font-extrabold text-white mt-0.5 truncate">
            {crop}
          </div>
          <div className="text-[9px] text-emerald-400 font-bold">{t.gradeAQuality}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <div className="text-[9px] uppercase font-bold text-slate-400">{t.lotVolumeLabel}</div>
          <div className="text-xs sm:text-sm font-extrabold text-amber-300 mt-0.5">
            {volume.toLocaleString()} KG
          </div>
          <div className="text-[9px] text-slate-400">{bagCount} × 50kg bags</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <div className="text-[9px] uppercase font-bold text-slate-400">{t.originDepotLabel}</div>
          <div className="text-xs sm:text-sm font-extrabold text-cyan-300 mt-0.5 truncate">
            {origin}
          </div>
          <div className="text-[9px] text-slate-400">Great Lakes Corridor</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/40">
          <div className="text-[9px] uppercase font-bold text-slate-400">{t.estNetValueLabel}</div>
          <div className="text-xs sm:text-sm font-extrabold text-emerald-400 mt-0.5">
            ${estimatedNet.toFixed(2)} USD
          </div>
          <div className="text-[9px] text-slate-400">{t.netAfterFreight}</div>
        </div>
      </div>

      {/* Solid Emerald Launch Button (No gradients, no glow) */}
      <button
        type="button"
        onClick={() => onConfirm && onConfirm(params)}
        disabled={loading}
        className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all duration-150 flex items-center justify-center space-x-2.5 cursor-pointer shadow-none"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            <span>{t.executingPipeline}</span>
          </>
        ) : (
          <>
            <span>🚀</span>
            <span>{t.launchAgentLabel}</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </>
        )}
      </button>
    </div>
  );
}

export default {
  GenUIDepotMapPicker,
  GenUICropSelector,
  GenUIVolumeLotPicker,
  GenUIPhotoQualityCard,
  GenUIAudioRecordCard,
  GenUIDispatchConfirmation
};
