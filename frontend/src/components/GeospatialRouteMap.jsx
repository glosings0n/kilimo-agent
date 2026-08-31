import { translations } from '../utils/translations';
import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  TrendingUp,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import GeminiIcon from './GeminiIcon';

// Regional Coordinates Dictionary for East African & Great Lakes Corridor
const LOCATION_COORDINATES = {
  // Origin Depots
  "Bunia Depot": [1.5667, 30.2500],
  "Bunia": [1.5667, 30.2500],
  "Goma Logistics Center": [-1.6742, 29.2285],
  "Goma": [-1.6742, 29.2285],
  "Bukavu Transit Depot": [-2.5083, 28.8608],
  "Bukavu": [-2.5083, 28.8608],
  "Kitale Depot": [1.0191, 35.0023],
  "Kitale": [1.0191, 35.0023],
  "Eldoret Depot": [0.5143, 35.2698],
  "Eldoret": [0.5143, 35.2698],
  "Nakuru Depot": [-0.3031, 36.0800],
  "Nakuru": [-0.3031, 36.0800],
  "Gisenyi Border Station": [-1.7028, 29.2564],
  "Gisenyi": [-1.7028, 29.2564],

  // Destination & Market Hubs
  "Border Trade Zone": [0.4608, 34.1115], // Busia / Malaba cross-border hub
  "Border Trade Zone Wholesale Terminal": [0.4608, 34.1115],
  "Coastal Wholesale Terminal": [-4.0435, 39.6682], // Mombasa
  "Coastal Wholesale Terminal / Mombasa": [-4.0435, 39.6682],
  "Central Market Hub": [-1.2921, 36.8219], // Nairobi
  "Nairobi Central Millers": [-1.2921, 36.8219],
  "Kampala Agri Terminal": [0.3476, 32.5825],
  "Kigali Agro Terminal": [-1.9441, 30.0619],
  "Kisumu Lake Terminal": [-0.0917, 34.7680],

  // Corridor Opportunity Hubs
  "Nakuru Millers": [-0.2833, 36.0667],
  "Nakuru Millers & Feed Mill": [-0.2833, 36.0667],
  "Busia Border": [0.4608, 34.1115],
  "Busia Border Fast-Track": [0.4608, 34.1115],
  "Eldoret Silos": [0.5200, 35.2800],
  "Eldoret NCPB Strategic Silos": [0.5200, 35.2800],
  "Malaba Dry Port": [0.6339, 34.2750]
};

// Strategic intermediate corridor opportunity candidates
const STRATEGIC_CORRIDOR_OPPORTUNITIES = [
  {
    id: "opp-nakuru",
    name: "Nakuru Millers & Feed Mill",
    coords: [-0.2833, 36.0667],
    spotPrice: 0.44,
    spotPriceFormatted: "$0.44/KG",
    freightSaving: "+$32.00 USD",
    netDelta: "+$85.00 USD",
    demandType: "High Demand (Flour & Animal Feed Mill)",
    transitHours: "3.5 hrs from border",
    status: "ACTIVE_BUYER",
    capacity: "45,000 MT/month"
  },
  {
    id: "opp-busia",
    name: "Busia Border Fast-Track Terminal",
    coords: [0.4608, 34.1115],
    spotPrice: 0.47,
    spotPriceFormatted: "$0.47/KG",
    freightSaving: "+$45.00 USD",
    netDelta: "+$110.00 USD",
    demandType: "Cross-Border Commercial Arbitrage",
    transitHours: "Direct border clearance",
    status: "HIGH_ARBITRAGE",
    capacity: "25,000 MT/month"
  },
  {
    id: "opp-eldoret",
    name: "Eldoret NCPB Strategic Grain Silos",
    coords: [0.5200, 35.2800],
    spotPrice: 0.42,
    spotPriceFormatted: "$0.42/KG",
    freightSaving: "+$20.00 USD",
    netDelta: "+$48.00 USD",
    demandType: "Government Strategic Food Reserve",
    transitHours: "1.8 hrs from Kitale",
    status: "GUARANTEED_OFFTAKE",
    capacity: "100,000 MT capacity"
  },
  {
    id: "opp-kisumu",
    name: "Kisumu Port & Lake Basin Logistics",
    coords: [-0.0917, 34.7680],
    spotPrice: 0.43,
    spotPriceFormatted: "$0.43/KG",
    freightSaving: "+$25.00 USD",
    netDelta: "+$62.00 USD",
    demandType: "Lake Victoria Regional Transshipment",
    transitHours: "2.2 hrs from Busia",
    status: "WATERWAY_ROUTE",
    capacity: "30,000 MT/month"
  }
];

// Helper to resolve coordinates from string
function resolveCoordinates(name, fallback = [0.4608, 34.1115]) {
  if (!name) return fallback;
  if (LOCATION_COORDINATES[name]) return LOCATION_COORDINATES[name];
  
  const lower = name.toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return coords;
    }
  }
  return fallback;
}

// Custom DivIcons for Leaflet
function createOriginIcon(label) {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
        <!-- Main Emerald Origin Badge -->
        <div class="relative z-10 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-slate-950 font-black text-[11px]">
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>

        <!-- Floating Tag -->
        <div class="absolute -top-7 px-2.5 py-0.5 rounded-md bg-slate-900 border border-emerald-500 text-[10px] font-bold text-emerald-400 whitespace-nowrap pointer-events-none">
          ORIGIN: ${label || "Depot"}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function createDestinationIcon(label) {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
        <!-- Cyan Destination Badge -->
        <div class="relative z-10 w-7 h-7 rounded-full bg-cyan-400 border-2 border-slate-950 flex items-center justify-center text-slate-950 font-black text-[11px]">
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>

        <!-- Floating Tag -->
        <div class="absolute -top-7 px-2.5 py-0.5 rounded-md bg-slate-900 border border-cyan-400 text-[10px] font-bold text-cyan-300 whitespace-nowrap pointer-events-none">
          OPTIMAL HUB: ${label || "Market"}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function createOpportunityIcon(label) {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
        <!-- Amber Opportunity Diamond Badge -->
        <div class="relative z-10 w-5 h-5 rounded-md rotate-45 bg-amber-400 border border-slate-950 flex items-center justify-center">
          <div class="-rotate-45 text-slate-950 font-black text-[8px]">★</div>
        </div>

        <!-- Tooltip -->
        <div class="absolute -bottom-6 px-2 py-0.5 rounded-md bg-slate-900 border border-amber-400 text-[9px] font-bold text-amber-300 whitespace-nowrap pointer-events-none">
          ${label}
        </div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
}

// Controller component to smoothly fit map bounds
function MapController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10, animate: true, duration: 1 });
      } catch {
        // ignore bounds calculation edge cases
      }
    }
  }, [bounds, map]);
  return null;
}

export default function GeospatialRouteMap({
  originName = "Bunia Depot",
  destinationName = "Border Trade Zone Wholesale Terminal",
  commodity = "Maize (Grade A)",
  volumeKg = 1500,
  netPayoutFormatted = "$615.00 USD",
  transitEta = "6.0 Hours",
  carrier = "East-West AgroLogistics Fleet",
  waybillId = "KILIMO-WB-63F15ADA",
  onSelectRouteOverride = null,
  lang = "en"
}) {
  const t = translations[lang] || translations.en || {};
  const [showRadarGrid, setShowRadarGrid] = useState(true);
  const [showOpportunities, setShowOpportunities] = useState(true);

  // Resolve origin and destination coords
  const originCoords = useMemo(() => resolveCoordinates(originName, [1.5667, 30.2500]), [originName]);
  const destCoords = useMemo(() => resolveCoordinates(destinationName, [0.4608, 34.1115]), [destinationName]);

  // Generate intermediate corridor waypoint (e.g. border crossing or junction)
  const corridorWaypoints = useMemo(() => {
    const points = [originCoords];
    
    // If routing from DRC (Bunia / Goma / Bukavu) to Kenya/Coast, route via Busia / Eldoret / Nakuru
    if (originCoords[1] < 32 && destCoords[1] > 34) {
      // Step 1: Border Crossing (Busia or Malaba)
      points.push([0.4608, 34.1115]);
      // Step 2: Rift Valley Hub (Nakuru) if destination is Nairobi or Mombasa
      if (destCoords[1] > 36) {
        points.push([-0.3031, 36.0800]);
      }
    } else if (originCoords[1] > 34 && destCoords[1] > 36) {
      // Kitale/Eldoret to Nairobi/Mombasa via Nakuru
      points.push([-0.3031, 36.0800]);
    }
    
    points.push(destCoords);
    return points;
  }, [originCoords, destCoords]);

  // Calculate approximate corridor distance
  const estimatedDistanceKm = useMemo(() => {
    let total = 0;
    for (let i = 0; i < corridorWaypoints.length - 1; i++) {
      const [lat1, lon1] = corridorWaypoints[i];
      const [lat2, lon2] = corridorWaypoints[i + 1];
      const dLat = (lat2 - lat1) * 111;
      const dLon = (lon2 - lon1) * 111 * Math.cos((lat1 * Math.PI) / 180);
      total += Math.sqrt(dLat * dLat + dLon * dLon);
    }
    return Math.round(total * 1.25); // Road winding multiplier
  }, [corridorWaypoints]);

  // Map bounds encompassing all points
  const mapBounds = useMemo(() => {
    const allPoints = [...corridorWaypoints];
    if (showOpportunities) {
      STRATEGIC_CORRIDOR_OPPORTUNITIES.forEach(opp => allPoints.push(opp.coords));
    }
    return allPoints;
  }, [corridorWaypoints, showOpportunities]);

  const mapCenter = useMemo(() => {
    const lat = (originCoords[0] + destCoords[0]) / 2;
    const lon = (originCoords[1] + destCoords[1]) / 2;
    return [lat, lon];
  }, [originCoords, destCoords]);

  return (
    <div className="rounded-3xl bg-[#0B0F19] border border-slate-800 p-4 sm:p-6  space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-wide">
                Geospatial Freight Corridor & Radar
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                LIVE GPS TRACE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Autonomous cross-border waypoint routing & strategic opportunity radar
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOpportunities(!showOpportunities)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              showOpportunities
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
            title="Toggle Strategic Corridor Opportunity Markers"
          >
            <GeminiIcon className="w-3.5 h-3.5" />
            <span>{t.corridorOpportunities}</span>
          </button>

          <button
            onClick={() => setShowRadarGrid(!showRadarGrid)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              showRadarGrid
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
            title="Toggle Radar Wave Rings"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.radarGrid}</span>
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800/90 bg-slate-950 aspect-[16/11] sm:aspect-[16/9] w-full shadow-inner z-0">
        <MapContainer
          center={mapCenter}
          zoom={7}
          scrollWheelZoom={false}
          className="w-full h-full"
          style={{ background: '#090D16' }}
        >
          {/* Dark Vector Map Tiles */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={16}
          />

          <MapController bounds={mapBounds} />

          {/* Radar Waves around Origin */}
          {showRadarGrid && (
            <>
              <CircleMarker
                center={originCoords}
                radius={45}
                pathOptions={{ color: '#10B981', weight: 1, dashArray: '4, 8', fillOpacity: 0.05, fillColor: '#10B981' }}
              />
              <CircleMarker
                center={originCoords}
                radius={90}
                pathOptions={{ color: '#10B981', weight: 1, dashArray: '2, 10', fillOpacity: 0.02, fillColor: '#10B981' }}
              />
            </>
          )}

          {/* Solid Route Polyline */}
          <Polyline
            positions={corridorWaypoints}
            pathOptions={{
              color: '#10B981',
              weight: 3.5,
              opacity: 1,
              dashArray: '6, 8',
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />

          {/* Origin Marker */}
          <Marker
            position={originCoords}
            icon={createOriginIcon(originName)}
          >
            <Popup className="dark-leaflet-popup">
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-emerald-500/40 min-w-[220px]">
                <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-black uppercase mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{t.originAgroDepot}</span>
                </div>
                <h4 className="font-extrabold text-white text-sm">{originName}</h4>
                <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Commodity:</span>
                    <span className="font-bold text-white">{commodity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Volume:</span>
                    <span className="font-bold text-amber-300">{volumeKg.toLocaleString()} KG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-bold text-emerald-400">Loaded & Sealed</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Primary Destination Marker */}
          <Marker
            position={destCoords}
            icon={createDestinationIcon(destinationName)}
          >
            <Popup className="dark-leaflet-popup">
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-cyan-500/40 min-w-[240px]">
                <div className="flex items-center space-x-1.5 text-cyan-300 text-xs font-black uppercase mb-1">
                  <GeminiIcon className="w-3.5 h-3.5" />
                  <span>{t.optimalArbitrageHub}</span>
                </div>
                <h4 className="font-extrabold text-white text-sm">{destinationName}</h4>
                <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Net Farmer Payout:</span>
                    <span className="font-black text-emerald-400">{netPayoutFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Transit Duration:</span>
                    <span className="font-bold text-white">{transitEta}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Waybill Ref:</span>
                    <span className="font-mono font-bold text-cyan-300">{waybillId}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Strategic Corridor Opportunity Markers */}
          {showOpportunities && STRATEGIC_CORRIDOR_OPPORTUNITIES.map((opp) => (
            <Marker
              key={opp.id}
              position={opp.coords}
              icon={createOpportunityIcon(opp.name.split(" ")[0])}
            >
              <Popup className="dark-leaflet-popup">
                <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl border border-amber-500/40 min-w-[260px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                      Opportunity Radar
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{opp.transitHours}</span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-white text-sm leading-snug">{opp.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">{opp.demandType}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
                    <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">{t.spotPriceLabel}</div>
                      <div className="font-extrabold text-amber-400">{opp.spotPriceFormatted}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">{t.freightSavingLabel}</div>
                      <div className="font-extrabold text-emerald-400">{opp.freightSaving}</div>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">Net Profit Delta:</span>
                    <span className="font-extrabold text-emerald-400">{opp.netDelta}</span>
                  </div>

                  {onSelectRouteOverride && (
                    <button
                      onClick={() => onSelectRouteOverride(opp)}
                      className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <span>{t.lockIntermediateRoute}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Route Telemetry HUD Overlay */}
        <div className="absolute top-3 left-3 z-[400] max-w-xs bg-slate-950/85 backdrop-blur-md border border-slate-800 p-3 rounded-2xl  pointer-events-auto space-y-2 hidden sm:block">
          <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>{t.corridorTelemetry}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase font-bold">{t.estDistanceLabel}</div>
              <div className="text-sm font-extrabold text-white mt-0.5">{estimatedDistanceKm} KM</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase font-bold">{t.transitWindowLabel}</div>
              <div className="text-sm font-extrabold text-cyan-300 mt-0.5">{transitEta}</div>
            </div>
          </div>
        </div>

        {/* Legend in bottom right */}
        <div className="absolute bottom-3 right-3 z-[400] bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl  flex items-center space-x-4 text-[10px] font-bold text-slate-300 pointer-events-auto">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>{t.originDepotLabel}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>{t.optimalArbitrageHub}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rotate-45 bg-amber-400 inline-block"></span>
            <span>{t.corridorOpportunities}</span>
          </div>
        </div>
      </div>

      {/* Corridor Summary Card Bottom Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400">{t.assignedFleetLabel}</div>
            <div className="text-xs font-bold text-white truncate">{carrier}</div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400">{t.estTransitEtaLabel}</div>
            <div className="text-xs font-extrabold text-cyan-300 truncate">{transitEta} (Direct Freight)</div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400">{t.netArbitragePayoutLabel}</div>
            <div className="text-xs font-extrabold text-emerald-400 truncate">{netPayoutFormatted}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
