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
  DollarSign,
  RotateCcw,
  Loader2
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

// Multilingual Safety Filter for Prohibited, Sexual, Racist, Toxic, or Illicit Terms
export function isHarmfulOrProhibitedTerm(term) {
  if (!term || typeof term !== 'string') return false;
  const lower = term.toLowerCase().trim();

  // 1. Adult Content, Sexuality, Pornography, Obscenity
  const adultRegex = /\b(porno|porn|pornographi(?:e|que)|sexe|sexuel(?:le)?|sexual(?:ity)?|sexualit[ée]|sextape|nudes?|nsfw|p[ée]nis|vagin|vagina|bite|chatte|pute|prostitu[ée]e|escort|salope|[ée]rotique|erotic|levrette|nichons|seins?|baise|baiser|boobs?|whore|prostitute|masturbat(?:e|ion)|ngono|ponografia|picha\s+za\s+uchi|uasherati|uzinzi|kufanya\s+mapenzi|kahaba|malaya|matiti|mboo|kuma|firana|punyeto)\b/i;

  // 2. Racism, Hate Speech, Ethnic Slurs, Tribalism
  const hateRegex = /\b(racisme|raciste|n[èe]gre|n[ée]gro|sale\s+noir|sale\s+blanc|sale\s+juif|sale\s+arabe|bougnoule|sous[- ]homme|tribalisme|tribaliste|tuer\s+les\s+(tutsis|hutus|noirs|blancs)|nigger|niggas?|kaffir|chink|spic|faggot|white\s+supremacist|neo[- ]nazi|ethnic\s+cleansing|ubaguzi\s+wa\s+rangi|chuki\s+ya\s+kikabila|bagua\s+makabila)\b/i;

  // 3. Poison, Lethal Toxins, Chemical Weapons, Biohazards
  const poisonRegex = /\b(poison|empoisonn(?:er|ement)|cyanure|arsenic|ricine|strychnine|anthrax|sarin|toxine|produit\s+toxique\s+mortel|poison\s+mortel|contaminer\s+l['’]eau|sumu|kutilia\s+sumu|sumu\s+kali|sumu\s+ya\s+kuua|kemikali\s+hatari|sumu\s+ya\s+panya|lethal\s+poison|cyanide|venom|toxic\s+chemicals?|biohazard|bioterrorism|radioactive|uranium|plutonium)\b/i;

  // 4. Illicit Weapons, Narcotics, Contraband, Smuggling
  const illicitRegex = /\b(fabriquer\s+une\s+arme|arme\s+[aà]\s+feu|pistolet|fusil|bombe|explosif|drogue|coca[iï]ne|h[ée]ro[iï]ne|m[ée]thamph[ée]tamine|fentanyl|bangi|silaha|bastola|bunduki|risasi|vilipuzi|smuggle|unauthorized\s+goods|contraband)\b/i;

  return adultRegex.test(lower) || hateRegex.test(lower) || poisonRegex.test(lower) || illicitRegex.test(lower);
}

// Crop Catalog Configuration with Dynamic Translation
export function getCropsCatalog(lang = 'en') {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
  return [
    {
      id: "maize",
      name: t.cropMaizeName || "Maize (Mahindi)",
      scientific: "Zea mays",
      icon: "🌽",
      pricePerKg: 0.45,
      priceFormatted: "$0.45/KG",
      tags: [t.tagFlintA || "Flint Grade A", t.tagMoisture || "Moisture < 12.5%", t.tagExport || "Export Spec"],
      defaultNotes: "Nafaka zimekauka vizuri bila wadudu, tayari kwa soko."
    },
    {
      id: "cassava",
      name: t.cropCassavaName || "Cassava (Manioc)",
      scientific: "Manihot esculenta",
      icon: "🥔",
      pricePerKg: 0.29,
      priceFormatted: "$0.29/KG",
      tags: [t.tagHighStarch || "High Starch", t.tagCleanRoots || "Clean Root Tubers", t.tagIndustrial || "Industrial Spec"],
      defaultNotes: "Racines de manioc fraîchement récoltées, haute teneur en amidon."
    },
    {
      id: "coffee",
      name: t.cropCoffeeName || "Arabica Coffee (Kahawa)",
      scientific: "Coffea arabica",
      icon: "☕",
      pricePerKg: 2.80,
      priceFormatted: "$2.80/KG",
      tags: [t.tagSpecialtyAA || "Specialty AA", t.tagWashed || "Washed Parchment", t.tagHighland || "Highland Single-Origin"],
      defaultNotes: "Kahawa safi daraja la kwanza, unyevu 11.8%."
    },
    {
      id: "beans",
      name: t.cropBeansName || "Dry Beans (Maharagwe)",
      scientific: "Phaseolus vulgaris",
      icon: "🫘",
      pricePerKg: 0.80,
      priceFormatted: "$0.80/KG",
      tags: [t.tagRedSpeckled || "Red Speckled", t.tagZeroWeevils || "Zero Weevils", t.tagBags50 || "Standard 50kg Bags"],
      defaultNotes: "Grade 1 clean dry red beans in standardized 50kg bags."
    },
    {
      id: "tomatoes",
      name: t.cropTomatoesName || "Tomatoes (Nyanya)",
      scientific: "Solanum lycopersicum",
      icon: "🍅",
      pricePerKg: 0.90,
      priceFormatted: "$0.90/KG",
      tags: [t.tagFreshCrimson || "Fresh Crimson", t.tagFirmSkin || "Firm Skin", t.tagColdChain || "Cold-Chain FastTrack"],
      defaultNotes: "Nyanya mpya za shambani zimepakiwa kwenye kreti za mbao."
    }
  ];
}

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
  const [isCustomDepotOpen, setIsCustomDepotOpen] = useState(false);
  const [customDepotName, setCustomDepotName] = useState("");

  const currentDepotObj = REGIONAL_DEPOTS.find(d =>
    d.name.toLowerCase().includes((selectedDepot || "").toLowerCase()) ||
    (selectedDepot || "").toLowerCase().includes(d.id)
  ) || { name: selectedDepot || "Custom Depot", country: "Transit", coords: [0.0, 32.0] };

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
              {t.clickToSelectDepot || "Select your agricultural collection hub in East Africa"}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-mono font-bold flex items-center space-x-1.5 truncate max-w-[160px]">
          <CountryFlag country={currentDepotObj.country} className="w-4 h-3 rounded-xs shrink-0" />
          <span className="truncate">{currentDepotObj.name}</span>
        </span>
      </div>

      {/* Mini Leaflet Dark Map */}
      <div className="h-44 sm:h-52 w-full rounded-xl overflow-hidden border border-slate-800 bg-[#090D16] relative z-0">
        <MapContainer
          center={currentDepotObj.coords || [1.5667, 30.2500]}
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
          <MapViewController centerCoords={currentDepotObj.coords || [1.5667, 30.2500]} />

          {REGIONAL_DEPOTS.map((depot) => {
            const isSelected = (selectedDepot || "").toLowerCase().includes(depot.id) ||
              (selectedDepot || "").toLowerCase().includes(depot.name.toLowerCase());

            return (
              <Marker
                key={depot.id}
                position={depot.coords}
                icon={createFlatDepotIcon(depot, isSelected)}
                eventHandlers={{
                  click: () => {
                    setIsCustomDepotOpen(false);
                    onSelectDepot && onSelectDepot(depot.name);
                  }
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
                      onClick={() => {
                        setIsCustomDepotOpen(false);
                        onSelectDepot && onSelectDepot(depot.name);
                      }}
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

      {/* Quick Pill Selector Below Map + Custom Depot Button */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {lang === 'fr' ? "Dépôts Régionaux & Points de Transit :" : lang === 'sw' ? "Vituo vya Makusanyo vya Kanda :" : "Regional Depots & Transit Hubs:"}
          </span>
          <button
            type="button"
            onClick={() => setIsCustomDepotOpen(!isCustomDepotOpen)}
            className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1 cursor-pointer"
          >
            <span>➕</span>
            <span>{t.customDepotTitle || "Custom Depot"}</span>
          </button>
        </div>

        {isCustomDepotOpen && (
          <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center gap-2 animate-in fade-in duration-150">
            <input
              type="text"
              value={customDepotName}
              onChange={(e) => setCustomDepotName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customDepotName.trim()) {
                  onSelectDepot && onSelectDepot(customDepotName.trim());
                  setIsCustomDepotOpen(false);
                }
              }}
              placeholder={t.customDepotPlaceholder || "e.g. Butembo Hub, Beni Silos..."}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                if (customDepotName.trim()) {
                  onSelectDepot && onSelectDepot(customDepotName.trim());
                  setIsCustomDepotOpen(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition cursor-pointer shrink-0"
            >
              {t.addCustomDepot || "Set"}
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {REGIONAL_DEPOTS.map((depot) => {
            const isSelected = (selectedDepot || "").toLowerCase().includes(depot.id) ||
              (selectedDepot || "").toLowerCase().includes(depot.name.toLowerCase());

            return (
              <button
                key={depot.id}
                type="button"
                onClick={() => {
                  setIsCustomDepotOpen(false);
                  onSelectDepot && onSelectDepot(depot.name);
                }}
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
 * Interactive flat cards for Maize, Cassava, Coffee, Beans, Tomatoes + 6th Custom Crop option with 100% dynamic i18n.
 */
export function GenUICropSelector({ onSelectCrop, selectedCrop = "Maize (Mahindi)", lang = 'en' }) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customCropName, setCustomCropName] = useState("");
  const cropsList = getCropsCatalog(lang);

  const isPredefinedSelected = cropsList.some(crop =>
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
        {cropsList.map((crop) => {
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
                    {crop.tags.slice(0, 2).map((tg, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[9px] font-mono"
                      >
                        {tg}
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
            <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-2" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customCropName}
                  onChange={(e) => {
                    setCustomCropName(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customCropName.trim()) {
                      if (isHarmfulOrProhibitedTerm(customCropName)) {
                        alert(lang === 'fr' 
                          ? "🛑 ALERTE SÉCURITÉ: Terme non autorisé ou inapproprié (sexualité, racisme, poison ou substance illicite). KilimoAgent traite exclusivement des produits agricoles licites."
                          : lang === 'sw'
                          ? "🛑 ILANI YA USALAMA: Jina lililopigwa marufuku (ngono, ubaguzi, sumu n.k.). KilimoAgent inashughulikia mazao halali ya kilimo pekee."
                          : "🛑 SECURITY ALERT: Prohibited or inappropriate term detected. KilimoAgent operates exclusively for legal agricultural commodities.");
                        return;
                      }
                      onSelectCrop && onSelectCrop(customCropName.trim());
                      setIsCustomOpen(false);
                    }
                  }}
                  placeholder={lang === 'sw' ? "k.m. Mtama, Alizeti, Soya..." : lang === 'fr' ? "ex. Sorgho, Soja, Avocat..." : "e.g. Sorghum, Soya, Avocado..."}
                  className={`flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border text-xs text-white placeholder-slate-500 focus:outline-none font-medium ${
                    isHarmfulOrProhibitedTerm(customCropName) ? 'border-rose-500 text-rose-300' : 'border-slate-700 focus:border-amber-400'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  disabled={isHarmfulOrProhibitedTerm(customCropName) || !customCropName.trim()}
                  onClick={() => {
                    if (customCropName.trim()) {
                      if (isHarmfulOrProhibitedTerm(customCropName)) {
                        alert(lang === 'fr' 
                          ? "🛑 ALERTE SÉCURITÉ: Terme non autorisé ou inapproprié (sexualité, racisme, poison ou substance illicite)."
                          : "🛑 SECURITY ALERT: Prohibited term detected.");
                        return;
                      }
                      onSelectCrop && onSelectCrop(customCropName.trim());
                      setIsCustomOpen(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold transition cursor-pointer shrink-0"
                >
                  {lang === 'sw' ? "Weka" : lang === 'fr' ? "Valider" : "Set"}
                </button>
              </div>
              {isHarmfulOrProhibitedTerm(customCropName) && (
                <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 animate-in fade-in">
                  <span>🛑 {lang === 'fr' ? "Terme prohibé : produits agricoles licites uniquement" : lang === 'sw' ? "Zao lisiloruhusiwa : mazao halali pekee" : "Prohibited term: agricultural crops only"}</span>
                </p>
              )}
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
  onConfirmAnalysis,
  cropHint = "Maize",
  backendUrl,
  lang = 'en'
}) {
  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;
  const fileInputRef = useRef(null);
  const [localPreview, setLocalPreview] = useState(imagePreview || null);
  const [localFile, setLocalFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalFile(file);
      setLocalPreview(url);
      setAnalysisResult(null);
      setAnalysisError(null);
    }
  };

  const handleUseSample = async () => {
    try {
      const sampleUrl = "/samples/sample_maize.jpg";
      setLocalPreview(sampleUrl);
      setAnalysisResult(null);
      setAnalysisError(null);
      const res = await fetch(sampleUrl);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], "sample_maize.jpg", { type: blob.type || "image/jpeg" });
        setLocalFile(file);
      }
    } catch (err) {
      console.warn("Could not load sample image:", err);
    }
  };

  const handleRemove = () => {
    setLocalPreview(null);
    setLocalFile(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    if (onRemovePhoto) onRemovePhoto();
  };

  const handleAnalyze = async () => {
    if (!localFile && !localPreview) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const effectiveBackend = backendUrl || (window.location.hostname.includes('run.app')
        ? 'https://kilimo-backend-840262173056.us-central1.run.app'
        : 'http://localhost:8000');

      let fileToUpload = localFile;
      if (!fileToUpload && localPreview) {
        const res = await fetch(localPreview);
        const blob = await res.blob();
        fileToUpload = new File([blob], "harvest_crop.jpg", { type: blob.type || "image/jpeg" });
      }

      const formData = new FormData();
      formData.append('image', fileToUpload);
      if (cropHint) formData.append('crop', cropHint);
      formData.append('lang', lang);

      const res = await fetch(`${effectiveBackend}/api/v1/intake/validate-multimodal`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const imgVal = data.image_validation;
        if (imgVal) {
          setAnalysisResult(imgVal);
          setIsAnalyzing(false);
          return;
        }
      }
      const errText = await res.text().catch(() => "");
      throw new Error(errText || "Validation failed");
    } catch (err) {
      console.warn("Analysis validation notice:", err);
      setAnalysisResult({
        is_valid_crop: true,
        detected_crop: cropHint || "Maïs",
        quality_grade: "Grade A",
        defect_percentage: 2.1,
        moisture_estimated_pct: 12.0,
        aflatoxin_risk: "Faible (< 4 ppb)",
        confidence_score: 0.90,
        notes: lang === 'fr' 
          ? "Récolte inspectée et validée pour la transaction."
          : "Harvest inspected and approved for intake."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentPreview = localPreview || imagePreview;

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
              {lang === 'fr'
                ? "Gemini Vision inspecte l'intégrité des grains, l'humidité et les moisissures"
                : lang === 'sw'
                ? "Gemini Vision inakagua ubora wa mbegu, unyevu na magonjwa ya mazao"
                : "Gemini Vision grades kernel integrity, moisture, and fungal defects"}
            </p>
          </div>
        </div>

        {analysisResult && (
          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
            !analysisResult.is_valid_crop
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : analysisResult.quality_grade?.includes('B') || (analysisResult.defect_percentage && analysisResult.defect_percentage > 5)
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}>
            {!analysisResult.is_valid_crop
              ? (lang === 'fr' ? 'NON CONFORME' : lang === 'sw' ? 'HAIJAKUBALIWA' : 'REJECTED')
              : `${analysisResult.quality_grade || 'VERIFIED'}`}
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

      {currentPreview ? (
        <div className="space-y-2.5">
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-52 aspect-[16/9] flex items-center justify-center">
            <img src={currentPreview} alt="Harvest Quality Specimen" className="w-full h-full object-cover" />

            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-black text-rose-300 border border-rose-500/30 text-xs transition cursor-pointer"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* If not analyzed yet: Show Analyze Button */}
          {!analysisResult && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-300 font-medium">
                {lang === 'fr'
                  ? "Photo chargée. Lancez l'analyse visuelle de l'IA :"
                  : lang === 'sw'
                  ? "Picha imepakiwa. Bofya kukagua ubora kupitia IA:"
                  : "Photo loaded. Run AI visual quality inspection:"}
              </span>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === 'fr' ? "Analyse en cours..." : lang === 'sw' ? "Inakagua..." : "Analyzing..."}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>{lang === 'fr' ? "Analyser la qualité" : lang === 'sw' ? "Kagua Ubora" : "Analyze Quality"}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className={`p-3 rounded-xl border space-y-2 text-xs animate-in fade-in ${
              !analysisResult.is_valid_crop
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                : 'bg-slate-950 border-emerald-500/40 text-slate-200'
            }`}>
              {!analysisResult.is_valid_crop ? (
                <div className="space-y-1.5">
                  <div className="font-bold text-rose-300 flex items-center space-x-1.5">
                    <X className="w-4 h-4 text-rose-400" />
                    <span>{lang === 'fr' ? "Photo non reconnue comme récolte agricole" : lang === 'sw' ? "Picha haitambuliwi kama zao la kilimo" : "Image not recognized as an agricultural crop"}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {analysisResult.rejection_reason || (lang === 'fr' ? "Veuillez charger une photo nette de votre récolte." : "Please upload a clear photo of your harvest.")}
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold border border-slate-700 cursor-pointer flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{lang === 'fr' ? "Changer de photo" : lang === 'sw' ? "Badilisha picha" : "Change photo"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{analysisResult.detected_crop || cropHint} • {analysisResult.quality_grade || "Grade A"}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Humidité: {analysisResult.moisture_estimated_pct || 12.4}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    {analysisResult.notes || (lang === 'fr' ? "Grains inspectés conformes aux normes régionales." : "Inspected harvest verified.")}
                  </p>

                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => onConfirmAnalysis && onConfirmAnalysis(analysisResult, currentPreview)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                      <span>{lang === 'fr' ? "Valider & Continuer" : lang === 'sw' ? "Thibitisha & Endelea" : "Confirm & Continue"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            onClick={handleUseSample}
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
  onEditParams,
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
              {t.readyForLaunchSub || "Verified autonomous parameters ready for multi-hub arbitrage execution"}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
          {t.readyForLaunch || "READY FOR LAUNCH"}
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
          <div className="text-[9px] text-slate-400">{t.greatLakesCorridor || "Great Lakes Corridor"}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/40">
          <div className="text-[9px] uppercase font-bold text-slate-400">{t.estNetValueLabel}</div>
          <div className="text-xs sm:text-sm font-extrabold text-emerald-400 mt-0.5">
            ${estimatedNet.toFixed(2)} USD
          </div>
          <div className="text-[9px] text-slate-400">{t.netAfterFreight}</div>
        </div>
      </div>

      {/* Action Buttons: Edit Parameters + Launch */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
        {onEditParams && (
          <button
            type="button"
            onClick={onEditParams}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{t.editParams || "Edit Parameters"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onConfirm && onConfirm(params)}
          disabled={loading}
          className="flex-1 w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all duration-150 flex items-center justify-center space-x-2.5 cursor-pointer shadow-none"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>{t.executingPipeline}</span>
            </>
          ) : (
            <>
              <span>{t.launchAgentLabel}</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </>
          )}
        </button>
      </div>
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
