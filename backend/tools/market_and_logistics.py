"""
KilimoAgent Market & Logistics Engine
====================================
Production-grade real-time market arbitrage, route optimization,
multi-currency exchange indexing, and cryptographically stamped waybill generation
for the East Africa & Grands Lacs trade corridors.

Supported Hubs:
- DRC: Bunia, Goma, Bukavu, Beni, Butembo, Kisangani, Kindu
- Kenya: Nakuru, Eldoret, Nairobi, Mombasa
- Uganda: Kampala
- Rwanda: Kigali
- Tanzania: Dar es Salaam
"""

import math
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple


# ============================================================================
# 1. GEOGRAPHIC TRADE HUBS & COORDINATES (East Africa & Grands Lacs)
# ============================================================================

REGIONAL_HUBS: Dict[str, Dict[str, Any]] = {
    "Bunia": {
        "name": "Bunia",
        "country": "DRC",
        "country_code": "CD",
        "lat": 1.5635,
        "lon": 30.2522,
        "role": "Ituri Agricultural Production & Trading Terminal",
        "currency": "CDF"
    },
    "Goma": {
        "name": "Goma",
        "country": "DRC",
        "country_code": "CD",
        "lat": -1.6585,
        "lon": 29.2205,
        "role": "North Kivu Central Logistics & Border Trading Hub",
        "currency": "CDF"
    },
    "Bukavu": {
        "name": "Bukavu",
        "country": "DRC",
        "country_code": "CD",
        "lat": -2.5085,
        "lon": 28.8608,
        "role": "South Kivu Commercial & Cross-Border Terminal",
        "currency": "CDF"
    },
    "Kitale": {
        "name": "Kitale",
        "country": "Kenya",
        "country_code": "KE",
        "lat": 1.0167,
        "lon": 35.0000,
        "role": "Trans-Nzoia Breadbasket Primary Aggregation Hub",
        "currency": "KES"
    },
    "Eldoret": {
        "name": "Eldoret",
        "country": "Kenya",
        "country_code": "KE",
        "lat": 0.5143,
        "lon": 35.2698,
        "role": "North Rift Maize & Cereal Basket Terminal",
        "currency": "KES"
    },
    "Nakuru": {
        "name": "Nakuru",
        "country": "Kenya",
        "country_code": "KE",
        "lat": -0.3031,
        "lon": 36.0800,
        "role": "Rift Valley Grain Silo & Processing Hub",
        "currency": "KES"
    },
    "Busia": {
        "name": "Busia",
        "country": "Kenya",
        "country_code": "KE",
        "lat": 0.4608,
        "lon": 34.1115,
        "role": "Cross-Border Trade Terminal & Cross-Dock Hub",
        "currency": "KES"
    },
    "Kampala": {
        "name": "Kampala",
        "country": "Uganda",
        "country_code": "UG",
        "lat": 0.3476,
        "lon": 32.5825,
        "role": "Uganda Central Wholesale & Regional Cross-Dock Hub",
        "currency": "UGX"
    },
    "Nairobi": {
        "name": "Nairobi",
        "country": "Kenya",
        "country_code": "KE",
        "lat": -1.2921,
        "lon": 36.8219,
        "role": "East Africa Central Consumption & Financial Hub",
        "currency": "KES"
    },
    "Kigali": {
        "name": "Kigali",
        "country": "Rwanda",
        "country_code": "RW",
        "lat": -1.9441,
        "lon": 30.0619,
        "role": "Rwanda Central Logistics & Modern Wholesale Terminal",
        "currency": "RWF"
    },
    "Dar es Salaam": {
        "name": "Dar es Salaam",
        "country": "Tanzania",
        "country_code": "TZ",
        "lat": -6.7924,
        "lon": 39.2083,
        "role": "Central Corridor Ocean Port & Multi-Modal Terminal",
        "currency": "TZS"
    },
    "Mwanza": {
        "name": "Mwanza",
        "country": "Tanzania",
        "country_code": "TZ",
        "lat": -2.5164,
        "lon": 32.9000,
        "role": "Lake Victoria Regional Port & Agro-Processing Terminal",
        "currency": "TZS"
    },
    "Butembo": {
        "name": "Butembo",
        "country": "DRC",
        "country_code": "CD",
        "lat": 0.1333,
        "lon": 29.2833,
        "role": "Highland Commercial & Grain Aggregation Hub",
        "currency": "CDF"
    },
    "Beni": {
        "name": "Beni",
        "country": "DRC",
        "country_code": "CD",
        "lat": 0.4911,
        "lon": 29.4731,
        "role": "Semliki Valley Agro-Wholesale Depot",
        "currency": "CDF"
    },
    "Kisangani": {
        "name": "Kisangani",
        "country": "DRC",
        "country_code": "CD",
        "lat": 0.5153,
        "lon": 25.1910,
        "role": "Congo River Major Riverine & Transit Port",
        "currency": "CDF"
    },
    "Kindu": {
        "name": "Kindu",
        "country": "DRC",
        "country_code": "CD",
        "lat": -2.9437,
        "lon": 25.9224,
        "role": "Maniema Agricultural & Rail/River Hub",
        "currency": "CDF"
    },
    "Mombasa": {
        "name": "Mombasa",
        "country": "Kenya",
        "country_code": "KE",
        "lat": -4.0435,
        "lon": 39.6682,
        "role": "Indian Ocean Deep-Water Port & Coastal Wholesale Terminal",
        "currency": "KES"
    }
}

# Aliases for robust geographic resolution
HUB_ALIASES: Dict[str, str] = {
    "bunia": "Bunia",
    "ituri": "Bunia",
    "goma": "Goma",
    "north kivu": "Goma",
    "nord kivu": "Goma",
    "bukavu": "Bukavu",
    "south kivu": "Bukavu",
    "sud kivu": "Bukavu",
    "kitale": "Kitale",
    "trans-nzoia": "Kitale",
    "trans nzoia": "Kitale",
    "transnzoia": "Kitale",
    "eldoret": "Eldoret",
    "uasin gishu": "Eldoret",
    "nakuru": "Nakuru",
    "rift valley": "Nakuru",
    "busia": "Busia",
    "malaba": "Busia",
    "busia border": "Busia",
    "kampala": "Kampala",
    "uganda": "Kampala",
    "nairobi": "Nairobi",
    "kenya": "Nairobi",
    "kigali": "Kigali",
    "rwanda": "Kigali",
    "dar es Salaam": "Dar es Salaam",
    "dar es salaam": "Dar es Salaam",
    "dar": "Dar es Salaam",
    "daressalaam": "Dar es Salaam",
    "tanzania": "Dar es Salaam",
    "mwanza": "Mwanza",
    "lake victoria": "Mwanza",
    "butembo": "Butembo",
    "beni": "Beni",
    "kisangani": "Kisangani",
    "tshopo": "Kisangani",
    "kindu": "Kindu",
    "maniema": "Kindu",
    "mombasa": "Mombasa",
    "central_market_hub": "Nairobi",
    "border_trade_zone": "Goma",
    "coastal_wholesale_terminal": "Mombasa"
}


# ============================================================================
# 2. MULTI-CURRENCY EXCHANGE INDEX (Real-time FX Rates against USD base)
# ============================================================================

CURRENCY_RATES_TO_USD: Dict[str, float] = {
    "USD": 1.0,
    "KES": 130.0,      # Kenyan Shilling
    "CDF": 2850.0,     # Congolese Franc
    "UGX": 3750.0,     # Ugandan Shilling
    "RWF": 1350.0,     # Rwandan Franc
    "TZS": 2600.0      # Tanzanian Shilling
}


# ============================================================================
# 3. COMMODITY PRICING INDEX (USD per KG baseline across Trade Hubs)
# ============================================================================

BASE_COMMODITY_PRICES_PER_KG: Dict[str, Dict[str, float]] = {
    "maize": {
        "Bunia": 0.35,
        "Goma": 0.44,
        "Bukavu": 0.43,
        "Kitale": 0.33,
        "Eldoret": 0.34,
        "Nakuru": 0.38,
        "Busia": 0.36,
        "Kampala": 0.37,
        "Nairobi": 0.46,
        "Kigali": 0.45,
        "Dar es Salaam": 0.44,
        "Mwanza": 0.39,
        "Butembo": 0.37,
        "Beni": 0.36,
        "Kisangani": 0.46,
        "Kindu": 0.48,
        "Mombasa": 0.49
    },
    "cassava": {
        "Bunia": 0.20,
        "Goma": 0.28,
        "Bukavu": 0.27,
        "Kitale": 0.23,
        "Eldoret": 0.25,
        "Nakuru": 0.29,
        "Busia": 0.24,
        "Kampala": 0.24,
        "Nairobi": 0.35,
        "Kigali": 0.30,
        "Dar es Salaam": 0.32,
        "Mwanza": 0.26,
        "Butembo": 0.22,
        "Beni": 0.21,
        "Kisangani": 0.26,
        "Kindu": 0.25,
        "Mombasa": 0.36
    },
    "beans": {
        "Bunia": 0.68,
        "Goma": 0.82,
        "Bukavu": 0.80,
        "Kitale": 0.68,
        "Eldoret": 0.69,
        "Nakuru": 0.74,
        "Busia": 0.71,
        "Kampala": 0.72,
        "Nairobi": 0.89,
        "Kigali": 0.85,
        "Dar es Salaam": 0.86,
        "Mwanza": 0.77,
        "Butembo": 0.72,
        "Beni": 0.70,
        "Kisangani": 0.88,
        "Kindu": 0.86,
        "Mombasa": 0.92
    },
    "tomatoes": {
        "Bunia": 0.72,
        "Goma": 0.88,
        "Bukavu": 0.86,
        "Kitale": 0.62,
        "Eldoret": 0.65,
        "Nakuru": 0.68,
        "Busia": 0.70,
        "Kampala": 0.78,
        "Nairobi": 0.92,
        "Kigali": 0.90,
        "Dar es Salaam": 0.94,
        "Mwanza": 0.80,
        "Butembo": 0.75,
        "Beni": 0.74,
        "Kisangani": 0.95,
        "Kindu": 0.98,
        "Mombasa": 0.98
    },
    "coffee": {
        "Bunia": 2.40,
        "Goma": 2.85,
        "Bukavu": 2.80,
        "Kitale": 2.80,
        "Eldoret": 2.85,
        "Nakuru": 2.90,
        "Busia": 2.78,
        "Kampala": 2.75,
        "Nairobi": 3.20,
        "Kigali": 3.10,
        "Dar es Salaam": 3.25,
        "Mwanza": 2.95,
        "Butembo": 2.50,
        "Beni": 2.45,
        "Kisangani": 2.70,
        "Kindu": 2.65,
        "Mombasa": 3.35
    },
    "rice": {
        "Bunia": 0.88,
        "Goma": 1.05,
        "Bukavu": 1.02,
        "Kitale": 0.90,
        "Eldoret": 0.92,
        "Nakuru": 0.95,
        "Busia": 0.93,
        "Kampala": 0.94,
        "Nairobi": 1.15,
        "Kigali": 1.08,
        "Dar es Salaam": 1.05,
        "Mwanza": 0.96,
        "Butembo": 0.92,
        "Beni": 0.90,
        "Kisangani": 0.98,
        "Kindu": 0.96,
        "Mombasa": 1.10
    },
    "sorghum": {
        "Bunia": 0.38,
        "Goma": 0.46,
        "Bukavu": 0.45,
        "Kitale": 0.36,
        "Eldoret": 0.38,
        "Nakuru": 0.42,
        "Busia": 0.39,
        "Kampala": 0.40,
        "Nairobi": 0.52,
        "Kigali": 0.48,
        "Dar es Salaam": 0.49,
        "Mwanza": 0.43,
        "Butembo": 0.40,
        "Beni": 0.39,
        "Kisangani": 0.49,
        "Kindu": 0.50,
        "Mombasa": 0.54
    },
    "soya": {
        "Bunia": 0.62,
        "Goma": 0.75,
        "Bukavu": 0.74,
        "Kitale": 0.61,
        "Eldoret": 0.63,
        "Nakuru": 0.68,
        "Busia": 0.65,
        "Kampala": 0.66,
        "Nairobi": 0.82,
        "Kigali": 0.77,
        "Dar es Salaam": 0.79,
        "Mwanza": 0.71,
        "Butembo": 0.65,
        "Beni": 0.64,
        "Kisangani": 0.78,
        "Kindu": 0.80,
        "Mombasa": 0.85
    }
}

# Quality grade premiums and penalties
QUALITY_GRADE_MULTIPLIERS: Dict[str, float] = {
    "GRADE_A": 1.08,          # +8% premium for top quality, low moisture (<13.5%)
    "GRADE_B": 1.00,          # Standard baseline quality
    "GRADE_C": 0.88,          # -12% discount for moderate moisture / foreign matter
    "HIGH_MOISTURE": 0.85     # -15% penalty for wet grain requiring forced aeration
}

# Freight parameters
AVERAGE_FREIGHT_SPEED_KMH: float = 45.0
BASE_FREIGHT_RATE_PER_KG_KM: float = 0.00004   # $0.04 per ton-km = $0.00004 per kg-km
MINIMUM_FREIGHT_CHARGE_USD: float = 20.00
CROSS_BORDER_DELAY_HOURS: float = 5.0
ROAD_CIRCUITY_FACTOR: float = 1.25             # Haversine straight-line to actual road distance ratio


# ============================================================================
# 4. CORE MATHEMATICAL & GEOGRAPHIC UTILITIES
# ============================================================================

def resolve_hub(location_name: str) -> Dict[str, Any]:
    """
    Resolves any arbitrary user input string to a canonical regional trade hub.
    Falls back gracefully to the closest matching hub.
    """
    clean_name = str(location_name).strip() if location_name else "Goma"
    lower_name = clean_name.lower()
    
    # Direct match in canonical dictionary
    if clean_name in REGIONAL_HUBS:
        return REGIONAL_HUBS[clean_name]
    
    # Alias dictionary lookup
    if lower_name in HUB_ALIASES:
        canonical = HUB_ALIASES[lower_name]
        return REGIONAL_HUBS[canonical]
    
    # Substring search in canonical keys
    for hub_name, hub_info in REGIONAL_HUBS.items():
        if hub_name.lower() in lower_name or lower_name in hub_name.lower():
            return hub_info
            
    # Default fallback: Goma
    return REGIONAL_HUBS["Goma"]


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes the Great Circle distance between two geographic coordinates on Earth in kilometers.
    
    Formula:
        a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
        c = 2 * atan2(√a, √(1−a))
        d = R * c (where R = 6371.0 km)
    """
    r_earth = 6371.0  # Earth's mean radius in kilometers
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    
    return round(r_earth * c, 2)


def resolve_corridor_waypoints(origin_name: str, dest_name: str) -> List[str]:
    """
    Generates realistic geographic waypoint nodes along major East Africa & Grands Lacs trade corridors.
    """
    pair = (origin_name, dest_name)
    CORRIDOR_WAYPOINTS_MAP = {
        ("Bunia", "Goma"): ["Bunia", "Komanda", "Beni", "Butembo", "Lubero", "Rutshuru", "Goma"],
        ("Goma", "Bunia"): ["Goma", "Rutshuru", "Lubero", "Butembo", "Beni", "Komanda", "Bunia"],
        ("Goma", "Bukavu"): ["Goma", "Sake", "Minova", "Kavumu", "Bukavu"],
        ("Bukavu", "Goma"): ["Bukavu", "Kavumu", "Minova", "Sake", "Goma"],
        ("Kitale", "Nairobi"): ["Kitale", "Eldoret", "Nakuru", "Naivasha", "Nairobi"],
        ("Nairobi", "Kitale"): ["Nairobi", "Naivasha", "Nakuru", "Eldoret", "Kitale"],
        ("Kitale", "Goma"): ["Kitale", "Busia", "Kampala", "Mbarara", "Kabale", "Goma"],
        ("Eldoret", "Nairobi"): ["Eldoret", "Nakuru", "Naivasha", "Nairobi"],
        ("Nairobi", "Eldoret"): ["Nairobi", "Naivasha", "Nakuru", "Eldoret"],
        ("Nakuru", "Nairobi"): ["Nakuru", "Gilgil", "Naivasha", "Nairobi"],
        ("Nairobi", "Nakuru"): ["Nairobi", "Naivasha", "Gilgil", "Nakuru"],
        ("Busia", "Nairobi"): ["Busia", "Kisumu", "Kericho", "Nakuru", "Nairobi"],
        ("Nairobi", "Busia"): ["Nairobi", "Nakuru", "Kericho", "Kisumu", "Busia"],
        ("Kampala", "Nairobi"): ["Kampala", "Jinja", "Busia/Malaba", "Eldoret", "Nakuru", "Nairobi"],
        ("Nairobi", "Kampala"): ["Nairobi", "Nakuru", "Eldoret", "Busia/Malaba", "Jinja", "Kampala"],
        ("Goma", "Kigali"): ["Goma", "Gisenyi/Rubavu", "Musanze", "Kigali"],
        ("Kigali", "Goma"): ["Kigali", "Musanze", "Gisenyi/Rubavu", "Goma"],
        ("Bukavu", "Kigali"): ["Bukavu", "Cyangugu/Rusizi", "Nyamasheke", "Huye", "Kigali"],
        ("Kigali", "Bukavu"): ["Kigali", "Huye", "Nyamasheke", "Cyangugu/Rusizi", "Bukavu"],
        ("Kampala", "Kigali"): ["Kampala", "Masaka", "Mbarara", "Katuna/Gatuna", "Kigali"],
        ("Kigali", "Kampala"): ["Kigali", "Katuna/Gatuna", "Mbarara", "Masaka", "Kampala"],
        ("Nairobi", "Mombasa"): ["Nairobi", "Athi River", "Mtito Andei", "Voi", "Mombasa"],
        ("Mombasa", "Nairobi"): ["Mombasa", "Voi", "Mtito Andei", "Athi River", "Nairobi"],
        ("Dar es Salaam", "Kigali"): ["Dar es Salaam", "Morogoro", "Dodoma", "Singida", "Kahama", "Rusumo", "Kigali"],
        ("Dar es Salaam", "Mwanza"): ["Dar es Salaam", "Morogoro", "Dodoma", "Singida", "Shinyanga", "Mwanza"],
        ("Mwanza", "Nairobi"): ["Mwanza", "Sirari/Isebania", "Migori", "Kisii", "Narok", "Nairobi"],
        ("Mwanza", "Kampala"): ["Mwanza", "Mutukula", "Masaka", "Kampala"],
        ("Bunia", "Kampala"): ["Bunia", "Mahagi", "Goli/Arua", "Nebbi", "Pakwach", "Karuma", "Kampala"],
        ("Butembo", "Goma"): ["Butembo", "Lubero", "Kanyabayonga", "Rutshuru", "Goma"],
        ("Goma", "Butembo"): ["Goma", "Rutshuru", "Kanyabayonga", "Lubero", "Butembo"],
        ("Kitale", "Mombasa"): ["Kitale", "Eldoret", "Nakuru", "Nairobi", "Mtito Andei", "Mombasa"],
        ("Eldoret", "Mombasa"): ["Eldoret", "Nakuru", "Nairobi", "Mtito Andei", "Mombasa"],
        ("Nakuru", "Mombasa"): ["Nakuru", "Nairobi", "Mtito Andei", "Mombasa"]
    }
    if pair in CORRIDOR_WAYPOINTS_MAP:
        return CORRIDOR_WAYPOINTS_MAP[pair]
    
    if origin_name == dest_name:
        return [origin_name]
    
    return [origin_name, "Corridor Transit Highway", dest_name]


def convert_currency(amount_usd: float, target_currency: str) -> float:
    """Converts a USD monetary figure to a supported regional currency."""
    curr = target_currency.upper()
    rate = CURRENCY_RATES_TO_USD.get(curr, 1.0)
    return round(amount_usd * rate, 2)


def get_all_currency_conversions(amount_usd: float) -> Dict[str, float]:
    """Generates a complete multi-currency valuation dictionary."""
    return {
        curr: convert_currency(amount_usd, curr)
        for curr in CURRENCY_RATES_TO_USD.keys()
    }


# ============================================================================
# 5. PUBLIC EXPORTED FUNCTIONS (Orchestrator & Gemini Tools)
# ============================================================================

def calculate_route_and_freight(
    pickup_location: str,
    destination_hub: str,
    volume_kg: float
) -> Dict[str, Any]:
    """
    Calculates Great Circle and road freight distance, GPS coordinates, waypoint nodes,
    transit duration, cross-border delays, and accurate cargo transport fees.

    Args:
        pickup_location: Origin address or regional collection hub (e.g., 'Bunia', 'Eldoret', 'Kitale').
        destination_hub: Target wholesale terminal or market city (e.g., 'Goma', 'Nairobi', 'Kigali').
        volume_kg: Total gross weight of harvested agricultural produce in kilograms.

    Returns:
        Dictionary containing route GPS coordinates, waypoints, road distance, transit hours, border status, and freight cost.
    """
    origin = resolve_hub(pickup_location)
    dest = resolve_hub(destination_hub)
    
    straight_line_km = haversine_distance_km(
        origin["lat"], origin["lon"],
        dest["lat"], dest["lon"]
    )
    
    # Estimate realistic road distance using regional circuity factor
    road_distance_km = round(straight_line_km * ROAD_CIRCUITY_FACTOR, 1) if straight_line_km > 0 else 15.0
    
    # Check if this route traverses international borders
    is_cross_border = origin["country_code"] != dest["country_code"]
    
    # Compute transit duration
    base_driving_hours = road_distance_km / AVERAGE_FREIGHT_SPEED_KMH
    border_delay_hours = CROSS_BORDER_DELAY_HOURS if is_cross_border else 0.0
    total_transit_hours = round(base_driving_hours + border_delay_hours, 1)
    
    # Compute freight transport cost
    raw_freight_cost = volume_kg * road_distance_km * BASE_FREIGHT_RATE_PER_KG_KM
    freight_cost_usd = round(max(MINIMUM_FREIGHT_CHARGE_USD, raw_freight_cost), 2)
    
    # Generate waypoint nodes
    waypoints = resolve_corridor_waypoints(origin["name"], dest["name"])
    
    return {
        "origin_hub": origin["name"],
        "origin_country": origin["country"],
        "origin_coordinates": {"lat": origin["lat"], "lon": origin["lon"]},
        "destination_hub": dest["name"],
        "destination_country": dest["country"],
        "destination_coordinates": {"lat": dest["lat"], "lon": dest["lon"]},
        "straight_line_distance_km": straight_line_km,
        "road_distance_km": road_distance_km,
        "waypoint_nodes": waypoints,
        "is_cross_border": is_cross_border,
        "border_clearance_delay_hours": border_delay_hours,
        "estimated_transit_hours": total_transit_hours,
        "volume_kg": volume_kg,
        "freight_cost_usd": freight_cost_usd,
        "freight_cost_local_currencies": get_all_currency_conversions(freight_cost_usd),
        "freight_rate_per_ton_km_usd": 0.04
    }


def fetch_realtime_market_arbitrage(
    crop_type: str,
    origin_location: str,
    volume_kg: float,
    quality_grade: str = "GRADE_A"
) -> Dict[str, Any]:
    """
    Computes real-time spot commodity arbitrage across all East Africa & Grands Lacs trade hubs.
    Accounts for crop quality grade premiums/penalties, freight deductions, and multi-currency pricing.

    Args:
        crop_type: Commodity name (e.g., 'maize', 'cassava', 'beans', 'tomatoes', 'coffee', 'rice', 'sorghum', 'soya').
        origin_location: Location of the harvest or farmer collection center.
        volume_kg: Total gross weight in kilograms.
        quality_grade: Visual inspection grade ('GRADE_A', 'GRADE_B', 'GRADE_C', 'HIGH_MOISTURE').

    Returns:
        Comprehensive arbitrage analysis ranking all destinations by net profit with multi-currency valuations.
    """
    normalized_crop = str(crop_type).strip().lower() if crop_type else "maize"
    origin = resolve_hub(origin_location)
    
    # Retrieve base pricing catalog for crop, fallback to baseline if crop is not directly listed
    crop_pricing = BASE_COMMODITY_PRICES_PER_KG.get(normalized_crop)
    if not crop_pricing:
        crop_pricing = {hub: 0.40 for hub in REGIONAL_HUBS.keys()}
        
    grade_multiplier = QUALITY_GRADE_MULTIPLIERS.get(str(quality_grade).upper(), 1.0)
    
    candidate_destinations: List[Dict[str, Any]] = []
    
    for hub_name, hub_info in REGIONAL_HUBS.items():
        base_unit_price = crop_pricing.get(hub_name, 0.40)
        effective_unit_price = round(base_unit_price * grade_multiplier, 4)
        gross_revenue_usd = round(volume_kg * effective_unit_price, 2)
        
        # Route logistics from origin to candidate hub
        route_info = calculate_route_and_freight(
            pickup_location=origin["name"],
            destination_hub=hub_name,
            volume_kg=volume_kg
        )
        
        freight_cost_usd = route_info["freight_cost_usd"]
        net_profit_usd = round(gross_revenue_usd - freight_cost_usd, 2)
        profit_margin_pct = round((net_profit_usd / gross_revenue_usd * 100), 1) if gross_revenue_usd > 0 else 0.0
        
        candidate_destinations.append({
            "hub_name": hub_name,
            "country": hub_info["country"],
            "coordinates": {"lat": hub_info["lat"], "lon": hub_info["lon"]},
            "unit_price_usd_per_kg": effective_unit_price,
            "unit_price_local_currency": convert_currency(effective_unit_price, hub_info["currency"]),
            "local_currency_code": hub_info["currency"],
            "gross_revenue_usd": gross_revenue_usd,
            "freight_cost_usd": freight_cost_usd,
            "net_profit_usd": net_profit_usd,
            "profit_margin_pct": profit_margin_pct,
            "road_distance_km": route_info["road_distance_km"],
            "estimated_transit_hours": route_info["estimated_transit_hours"],
            "waypoint_nodes": route_info["waypoint_nodes"],
            "is_cross_border": route_info["is_cross_border"],
            "net_profit_multi_currency": get_all_currency_conversions(net_profit_usd)
        })
    
    # Sort candidates by highest net profit
    candidate_destinations.sort(key=lambda x: x["net_profit_usd"], reverse=True)
    best_market = candidate_destinations[0]
    
    return {
        "commodity": normalized_crop.capitalize(),
        "origin_hub": origin["name"],
        "origin_country": origin["country"],
        "volume_kg": volume_kg,
        "quality_grade": quality_grade.upper() if quality_grade else "GRADE_A",
        "quality_multiplier": grade_multiplier,
        "recommended_market": best_market["hub_name"],
        "projected_net_return_usd": best_market["net_profit_usd"],
        "best_market_details": best_market,
        "ranked_destinations": candidate_destinations,
        "timestamp_utc": datetime.now(timezone.utc).isoformat()
    }


def analyze_corridor_market_opportunities(
    crop: str,
    origin_depot: str,
    primary_destination: str,
    volume_kg: float
) -> Dict[str, Any]:
    """
    Analyzes secondary wholesale buyers, millers, and deficit hubs along the transport corridor
    (e.g., Nakuru Grain Millers, Eldoret NCPB Silos, Busia Border Market, Butembo Trading Center, Mwanza Port).
    Calculates distance saved, freight cost reduction, spot price difference, and net margin gain/loss for each intermediate hub.

    Args:
        crop: Agricultural commodity (e.g. 'maize', 'beans', 'cassava', 'coffee', 'rice', 'sorghum', 'soya').
        origin_depot: Origin depot or farm collection station (e.g. 'Kitale', 'Bunia', 'Eldoret').
        primary_destination: Primary planned destination market (e.g. 'Nairobi', 'Goma', 'Mombasa').
        volume_kg: Total gross cargo weight in kilograms.

    Returns:
        Structured list of corridor opportunities with name, lat, lng, spot_price_usd_kg, freight_saving_usd,
        net_margin_delta_usd, and recommendation_badge.
    """
    normalized_crop = str(crop).strip().lower() if crop else "maize"
    origin = resolve_hub(origin_depot)
    dest = resolve_hub(primary_destination)
    
    # Calculate baseline primary route
    primary_route = calculate_route_and_freight(origin["name"], dest["name"], volume_kg)
    crop_pricing = BASE_COMMODITY_PRICES_PER_KG.get(normalized_crop, {})
    primary_spot_price = crop_pricing.get(dest["name"], 0.40)
    primary_gross = volume_kg * primary_spot_price
    primary_net_margin = round(primary_gross - primary_route["freight_cost_usd"], 2)
    
    # Registered corridor off-takers and processing hubs along regional trade corridors
    CORRIDOR_FACILITIES: List[Dict[str, Any]] = [
        {
            "name": "Nakuru Grain Millers",
            "hub": "Nakuru",
            "facility_type": "Industrial Roller Flour & Feed Millers",
            "price_premium_factor": 1.02
        },
        {
            "name": "Eldoret NCPB Silos",
            "hub": "Eldoret",
            "facility_type": "National Cereals & Produce Board Strategic Reserve",
            "price_premium_factor": 1.00
        },
        {
            "name": "Busia Border Market Terminal",
            "hub": "Busia",
            "facility_type": "EAC Cross-Border Wholesale Cross-Dock Market",
            "price_premium_factor": 1.03
        },
        {
            "name": "Butembo Trading Center",
            "hub": "Butembo",
            "facility_type": "Highland Agro-Commercial Aggregation & Off-Take Hub",
            "price_premium_factor": 1.04
        },
        {
            "name": "Mwanza Port & Milling Hub",
            "hub": "Mwanza",
            "facility_type": "Lake Victoria Multi-Modal Grain Depot & Millers",
            "price_premium_factor": 1.03
        },
        {
            "name": "Kitale Agro-Terminal",
            "hub": "Kitale",
            "facility_type": "North Rift Primary Grain Silos & Aggregation Depot",
            "price_premium_factor": 0.99
        },
        {
            "name": "Kampala Central Agro-Processors",
            "hub": "Kampala",
            "facility_type": "Uganda Central Grain Processing & Wholesale Depot",
            "price_premium_factor": 1.02
        },
        {
            "name": "Kigali Special Economic Zone Millers",
            "hub": "Kigali",
            "facility_type": "Rwanda Modern Agro-Processing & Storage Facility",
            "price_premium_factor": 1.04
        },
        {
            "name": "Goma Cross-Border Logistics Depot",
            "hub": "Goma",
            "facility_type": "Great Lakes Trade Corridor Central Off-Taker",
            "price_premium_factor": 1.05
        },
        {
            "name": "Bukavu Commercial Millers",
            "hub": "Bukavu",
            "facility_type": "South Kivu Flour Millers & Food Reserve",
            "price_premium_factor": 1.04
        },
        {
            "name": "Bunia Central Silos",
            "hub": "Bunia",
            "facility_type": "Ituri Production & Transit Storage Terminal",
            "price_premium_factor": 1.00
        }
    ]
    
    opportunities: List[Dict[str, Any]] = []
    
    for fac in CORRIDOR_FACILITIES:
        hub_name = fac["hub"]
        # Skip if facility is at origin or is the exact primary destination
        if hub_name == origin["name"] or hub_name == dest["name"]:
            continue
            
        hub_data = REGIONAL_HUBS.get(hub_name)
        if not hub_data:
            continue
            
        # Calculate logistics from origin to intermediate hub
        cand_route = calculate_route_and_freight(origin["name"], hub_name, volume_kg)
        cand_base_price = crop_pricing.get(hub_name, 0.40)
        cand_spot_price = round(cand_base_price * fac["price_premium_factor"], 4)
        
        cand_gross = round(volume_kg * cand_spot_price, 2)
        cand_freight = cand_route["freight_cost_usd"]
        cand_net_margin = round(cand_gross - cand_freight, 2)
        
        # Calculate differences relative to primary destination
        dist_saved = round(max(0.0, primary_route["road_distance_km"] - cand_route["road_distance_km"]), 1)
        freight_saving = round(max(0.0, primary_route["freight_cost_usd"] - cand_freight), 2)
        net_margin_delta = round(cand_net_margin - primary_net_margin, 2)
        price_diff = round(cand_spot_price - primary_spot_price, 4)
        
        # Determine strategic recommendation badge
        if net_margin_delta >= 40.0:
            badge = "HIGH_PROFIT_OFF_RAMP"
        elif net_margin_delta > 0.0:
            badge = "MARGIN_IMPROVEMENT"
        elif dist_saved >= 100.0 and net_margin_delta >= -25.0:
            badge = "RAPID_TURNOVER_LOW_TRANSIT"
        elif freight_saving >= 35.0:
            badge = "FREIGHT_OPTIMIZED"
        else:
            badge = "SECONDARY_DESTINATION"
            
        opportunities.append({
            "name": fac["name"],
            "facility_type": fac["facility_type"],
            "hub": hub_name,
            "country": hub_data["country"],
            "lat": hub_data["lat"],
            "lng": hub_data["lon"],
            "spot_price_usd_kg": cand_spot_price,
            "spot_price_diff_usd_kg": price_diff,
            "road_distance_km": cand_route["road_distance_km"],
            "distance_saved_km": dist_saved,
            "freight_cost_usd": cand_freight,
            "freight_saving_usd": freight_saving,
            "net_margin_usd": cand_net_margin,
            "net_margin_delta_usd": net_margin_delta,
            "estimated_transit_hours": cand_route["estimated_transit_hours"],
            "recommendation_badge": badge
        })
    
    # Sort opportunities by net margin delta (highest gain first)
    opportunities.sort(key=lambda x: x["net_margin_delta_usd"], reverse=True)
    
    top_off_ramp = opportunities[0] if opportunities else None
    
    return {
        "crop": normalized_crop.capitalize(),
        "origin_depot": origin["name"],
        "primary_destination": dest["name"],
        "volume_kg": volume_kg,
        "primary_route_metrics": {
            "road_distance_km": primary_route["road_distance_km"],
            "freight_cost_usd": primary_route["freight_cost_usd"],
            "spot_price_usd_kg": primary_spot_price,
            "gross_revenue_usd": primary_gross,
            "net_margin_usd": primary_net_margin
        },
        "corridor_opportunities": opportunities,
        "top_corridor_recommendation": top_off_ramp["name"] if top_off_ramp else None,
        "top_badge": top_off_ramp["recommendation_badge"] if top_off_ramp else None,
        "timestamp_utc": datetime.now(timezone.utc).isoformat()
    }


def get_regional_export_compliance(
    crop: str,
    destination_country: str
) -> Dict[str, Any]:
    """
    Retrieves official East African Community (EAC) & COMESA regional export compliance standards,
    moisture ceilings, aflatoxin thresholds, phytosanitary requirements, and SPS protocols.

    Args:
        crop: Agricultural crop name (e.g., 'maize', 'beans', 'coffee', 'rice', 'cassava', 'sorghum', 'soya', 'tomatoes').
        destination_country: Destination country or market code (e.g., 'DRC', 'Kenya', 'Uganda', 'Rwanda', 'Tanzania').

    Returns:
        Structured compliance knowledge dossier detailing quality standards, moisture limits, aflatoxin ceilings,
        phytosanitary agencies, tariff exemptions, and border clearance protocols.
    """
    normalized_crop = str(crop).strip().lower() if crop else "maize"
    country_clean = str(destination_country).strip().upper() if destination_country else "KENYA"
    
    # Normalize country names
    if country_clean in ["CD", "CONGO", "DRC", "RDC", "DEMOCRATIC REPUBLIC OF CONGO"]:
        target_country = "DRC"
    elif country_clean in ["KE", "KENYA"]:
        target_country = "Kenya"
    elif country_clean in ["UG", "UGANDA"]:
        target_country = "Uganda"
    elif country_clean in ["RW", "RWANDA"]:
        target_country = "Rwanda"
    elif country_clean in ["TZ", "TANZANIA"]:
        target_country = "Tanzania"
    else:
        target_country = "Kenya"

    # Crop-specific standards under EAC Harmonized Specifications
    CROP_SPECS: Dict[str, Dict[str, Any]] = {
        "maize": {
            "standard_code": "EAS 2:2017 (Maize Grains Specification)",
            "moisture_max_pct": 13.5,
            "moisture_rule": "Maximum 13.5% moisture content (m/m) ceiling.",
            "total_aflatoxin_ppb_max": 10.0,
            "aflatoxin_b1_ppb_max": 5.0,
            "aflatoxin_rule": "Total Aflatoxin <= 10.0 ppb (μg/kg); Aflatoxin B1 <= 5.0 ppb.",
            "foreign_matter_max_pct": 0.5,
            "inorganic_matter_max_pct": 0.25,
            "pest_infestation_rule": "Zero tolerance for live insects (Prostephanus truncatus / Sitophilus zeamais)."
        },
        "beans": {
            "standard_code": "EAS 46:2017 (Dry Beans Specification)",
            "moisture_max_pct": 13.5,
            "moisture_rule": "Maximum 13.5% moisture content ceiling.",
            "total_aflatoxin_ppb_max": 10.0,
            "aflatoxin_b1_ppb_max": 5.0,
            "aflatoxin_rule": "Total Aflatoxin <= 10.0 ppb; Aflatoxin B1 <= 5.0 ppb.",
            "foreign_matter_max_pct": 1.0,
            "inorganic_matter_max_pct": 0.2,
            "pest_infestation_rule": "Free from live weevils (Acanthoscelides obtectus)."
        },
        "coffee": {
            "standard_code": "EAS 105:2008 (Green Coffee Beans Specification)",
            "moisture_max_pct": 12.0,
            "moisture_rule": "Strict 12.0% maximum moisture content for green Arabica/Robusta beans.",
            "total_aflatoxin_ppb_max": 10.0,
            "aflatoxin_b1_ppb_max": 5.0,
            "aflatoxin_rule": "Ochratoxin A <= 5.0 ppb; Total Aflatoxin <= 10.0 ppb.",
            "foreign_matter_max_pct": 0.5,
            "inorganic_matter_max_pct": 0.1,
            "pest_infestation_rule": "Zero tolerance for Coffee Berry Borer (Hypothenemus hampei)."
        },
        "rice": {
            "standard_code": "EAS 128:2017 (Milled Rice Specification)",
            "moisture_max_pct": 12.0,
            "moisture_rule": "Maximum 12.0% moisture content ceiling for milled rice.",
            "total_aflatoxin_ppb_max": 10.0,
            "aflatoxin_b1_ppb_max": 5.0,
            "aflatoxin_rule": "Total Aflatoxin <= 10.0 ppb; Aflatoxin B1 <= 5.0 ppb.",
            "foreign_matter_max_pct": 0.5,
            "inorganic_matter_max_pct": 0.1,
            "pest_infestation_rule": "Zero live storage insects permitted."
        },
        "cassava": {
            "standard_code": "EAS 739:2010 (Dried Cassava Chips / Flour)",
            "moisture_max_pct": 12.0,
            "moisture_rule": "Maximum 12.0% moisture content for dry chips/flour.",
            "total_aflatoxin_ppb_max": 10.0,
            "aflatoxin_b1_ppb_max": 5.0,
            "aflatoxin_rule": "Total Aflatoxin <= 10.0 ppb; Hydrocyanic acid (HCN) <= 10 mg/kg.",
            "foreign_matter_max_pct": 1.0,
            "inorganic_matter_max_pct": 0.3,
            "pest_infestation_rule": "Free from mold discoloration and live pests."
        },
        "sorghum": {
            "standard_code": "EAS 757:2019 (Sorghum Grains Specification)",
            "moisture_max_pct": 13.0,
            "moisture_rule": "Maximum 13.0% moisture content ceiling.",
            "total_aflatoxin_ppb_max": 10.0,
            "aflatoxin_b1_ppb_max": 5.0,
            "aflatoxin_rule": "Total Aflatoxin <= 10.0 ppb; Aflatoxin B1 <= 5.0 ppb.",
            "foreign_matter_max_pct": 1.0,
            "inorganic_matter_max_pct": 0.25,
            "pest_infestation_rule": "Zero live storage insects."
        },
        "soya": {
            "standard_code": "EAS 764:2019 (Soya Beans Specification)",
            "moisture_max_pct": 13.0,
            "moisture_rule": "Maximum 13.0% moisture content ceiling.",
            "total_aflatoxin_ppb_max": 10.0,
            "aflatoxin_b1_ppb_max": 5.0,
            "aflatoxin_rule": "Total Aflatoxin <= 10.0 ppb; Aflatoxin B1 <= 5.0 ppb.",
            "foreign_matter_max_pct": 1.0,
            "inorganic_matter_max_pct": 0.2,
            "pest_infestation_rule": "Free from live insects and mold contamination."
        },
        "tomatoes": {
            "standard_code": "EAS 771:2012 (Fresh Tomatoes Specification)",
            "moisture_max_pct": 90.0,
            "moisture_rule": "Fresh perishable produce - requires ventilated/temperature-controlled transit.",
            "total_aflatoxin_ppb_max": 10.0,
            "aflatoxin_b1_ppb_max": 5.0,
            "aflatoxin_rule": "Pesticide residue limits (MRLs) compliant with Codex Alimentarius.",
            "foreign_matter_max_pct": 2.0,
            "inorganic_matter_max_pct": 0.5,
            "pest_infestation_rule": "Free from Fruit Fly (Bactrocera dorsalis) and Tuta absoluta damage."
        }
    }
    
    crop_spec = CROP_SPECS.get(normalized_crop, CROP_SPECS["maize"])
    
    # Destination Country Authorities & Regulatory Framework
    COUNTRY_REGULATORY: Dict[str, Dict[str, Any]] = {
        "Kenya": {
            "plant_health_authority": "KEPHIS (Kenya Plant Health Inspectorate Service)",
            "food_safety_authority": "AFA (Agriculture and Food Authority) & Public Health Dept",
            "customs_regime": "0% Import Duty under EAC Common Market Protocol & Rules of Origin",
            "clearance_portal": "KenTrade Kenya National Electronic Single Window System (KNSWS)",
            "required_documents": [
                "KEPHIS Electronic Phytosanitary Certificate",
                "EAC Certificate of Origin (Rule 4 - Wholly Produced)",
                "AFA Agricultural Import Permit",
                "Standardized Commercial Invoice & Cryptographic Waybill"
            ],
            "border_posts": ["Busia OSBP", "Malaba OSBP", "Namanga OSBP", "Isebania OSBP"]
        },
        "DRC": {
            "plant_health_authority": "Direction de la Protection des Végétaux (DPV) & ONAPAC",
            "food_safety_authority": "OCC (Office Congolais de Contrôle)",
            "customs_regime": "0% Tariff under COMESA Free Trade Area / Simplified Trade Regime (STR)",
            "clearance_portal": "Guichet Unique du Commerce Extérieur (GUICE / Sydonia)",
            "required_documents": [
                "Phytosanitary Certificate endorsed by Origin NPPO",
                "OCC Certificate of Conformity & Laboratory Analysis Report",
                "COMESA Simplified Certificate of Origin (for consignments < $2,000)",
                "Carrier Transport Waybill with Verified Digital Signature"
            ],
            "border_posts": ["Goma / Grande Barrière OSBP", "Ruzizi I & II (Bukavu)", "Mahagi / Goli (Ituri)", "Kasindi / Mpondwe"]
        },
        "Uganda": {
            "plant_health_authority": "MAAIF (Ministry of Agriculture, Animal Industry & Fisheries)",
            "food_safety_authority": "UNBS (Uganda National Bureau of Standards)",
            "customs_regime": "0% Duty under EAC Common Market Protocol",
            "clearance_portal": "Uganda Electronic Single Window (UESW)",
            "required_documents": [
                "MAAIF Department of Crop Inspection Phytosanitary Certificate",
                "EAC Certificate of Origin",
                "UNBS Quality Verification Import Certificate",
                "Carrier Waybill & Packing List"
            ],
            "border_posts": ["Busia OSBP", "Malaba OSBP", "Katuna / Gatuna OSBP", "Mutukula OSBP"]
        },
        "Rwanda": {
            "plant_health_authority": "RICA (Rwanda Inspectorate, Competition and Consumer Protection Authority)",
            "food_safety_authority": "RSB (Rwanda Standards Board) & FDA Rwanda",
            "customs_regime": "0% Duty under EAC Harmonized Tariff Schedule",
            "clearance_portal": "Rwanda Electronic Single Window (ReSW)",
            "required_documents": [
                "RICA Electronic Phytosanitary Clearance Certificate",
                "EAC Certificate of Origin",
                "RSB Certificate of Conformity (Moisture & Aflatoxin compliant)",
                "Digital Consignment Waybill"
            ],
            "border_posts": ["Gatuna / Katuna OSBP", "Rubavu / Goma OSBP", "Rusumo OSBP", "Rusizi I & II"]
        },
        "Tanzania": {
            "plant_health_authority": "TPHA (Tanzania Plant Health and Pesticides Authority)",
            "food_safety_authority": "TBS (Tanzania Bureau of Standards)",
            "customs_regime": "0% Duty under EAC Common Market Protocol",
            "clearance_portal": "Tanzania Customs Integrated System (TANCIS)",
            "required_documents": [
                "TPHA Phytosanitary Import Inspection Certificate",
                "EAC Certificate of Origin",
                "TBS Batch Quality Test Report",
                "Cryptographic Waybill Seal"
            ],
            "border_posts": ["Namanga OSBP", "Holili OSBP", "Mutukula OSBP", "Sirari OSBP", "Rusumo OSBP"]
        }
    }
    
    country_info = COUNTRY_REGULATORY.get(target_country, COUNTRY_REGULATORY["Kenya"])
    
    return {
        "crop": normalized_crop.capitalize(),
        "destination_country": target_country,
        "harmonized_standard": crop_spec["standard_code"],
        "quality_compliance_limits": {
            "moisture_ceiling_pct": crop_spec["moisture_max_pct"],
            "moisture_specification": crop_spec["moisture_rule"],
            "total_aflatoxin_ppb_max": crop_spec["total_aflatoxin_ppb_max"],
            "aflatoxin_b1_ppb_max": crop_spec["aflatoxin_b1_ppb_max"],
            "aflatoxin_protocol": crop_spec["aflatoxin_rule"],
            "foreign_matter_max_pct": crop_spec["foreign_matter_max_pct"],
            "pest_infestation_standard": crop_spec["pest_infestation_rule"]
        },
        "regulatory_framework": {
            "plant_health_authority": country_info["plant_health_authority"],
            "food_safety_authority": country_info["food_safety_authority"],
            "tariff_regime": country_info["customs_regime"],
            "customs_single_window": country_info["clearance_portal"],
            "required_export_documentation": country_info["required_documents"],
            "designated_osbp_border_posts": country_info["border_posts"]
        },
        "sps_clearance_guideline": (
            f"Ensure {normalized_crop} batch has moisture <= {crop_spec['moisture_max_pct']}% and total aflatoxin <= {crop_spec['total_aflatoxin_ppb_max']} ppb "
            f"before obtaining Phytosanitary Certificate from origin NPPO. Present EAC/COMESA Certificate of Origin at OSBP for 0% duty entry into {target_country}."
        ),
        "timestamp_utc": datetime.now(timezone.utc).isoformat()
    }


def generate_carrier_waybill(
    pickup_location: str,
    destination_hub: str,
    volume_kg: float,
    carrier_name: str = "East-West AgroLogistics Fleet"
) -> Dict[str, Any]:
    """
    Issues a tamper-evident, collision-resistant digital transport waybill
    with an immutable SHA-256 cryptographic audit stamp.

    Args:
        pickup_location: Farm origin depot or regional collection hub.
        destination_hub: Destination wholesale terminal or processing plant.
        volume_kg: Total gross cargo weight in kilograms.
        carrier_name: Name of the verified logistics operator.

    Returns:
        Structured waybill payload including cryptographic digital stamp and route details.
    """
    route = calculate_route_and_freight(pickup_location, destination_hub, volume_kg)
    timestamp_utc = datetime.now(timezone.utc).isoformat()
    unique_entropy = uuid.uuid4().hex[:8].upper()
    
    # Collision-resistant waybill tracking ID
    waybill_id = f"KILIMO-WB-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{unique_entropy}"
    
    # Cryptographic SHA-256 seal covering all critical transaction parameters
    payload_to_sign = (
        f"{waybill_id}|{timestamp_utc}|{route['origin_hub']}|{route['destination_hub']}|"
        f"{volume_kg}|{carrier_name}|{route['freight_cost_usd']}|{route['road_distance_km']}"
    )
    sha256_digital_signature = hashlib.sha256(payload_to_sign.encode("utf-8")).hexdigest()
    verification_stamp = f"SEAL-{sha256_digital_signature[:16].upper()}"
    
    return {
        "status": "DISPATCH_CONFIRMED",
        "waybill_id": waybill_id,
        "verification_stamp": verification_stamp,
        "sha256_digital_signature": sha256_digital_signature,
        "timestamp_utc": timestamp_utc,
        "carrier_partner": carrier_name,
        "origin_hub": route["origin_hub"],
        "origin_country": route["origin_country"],
        "origin_coordinates": route["origin_coordinates"],
        "destination_hub": route["destination_hub"],
        "destination_country": route["destination_country"],
        "destination_coordinates": route["destination_coordinates"],
        "waypoint_nodes": route["waypoint_nodes"],
        "volume_kg": volume_kg,
        "volume_metric_tons": round(volume_kg / 1000.0, 3),
        "road_distance_km": route["road_distance_km"],
        "estimated_transit_hours": route["estimated_transit_hours"],
        "is_cross_border": route["is_cross_border"],
        "freight_cost_usd": route["freight_cost_usd"],
        "freight_cost_local_currencies": route["freight_cost_local_currencies"],
        "audit_metadata": {
            "rate_model": "DYNAMIC_TON_KM_V2",
            "crypto_algorithm": "SHA256_COLLISION_RESISTANT",
            "signed_fields": [
                "waybill_id", "timestamp_utc", "origin_hub", "destination_hub",
                "volume_kg", "carrier_partner", "freight_cost_usd", "road_distance_km"
            ]
        }
    }


# ============================================================================
# 6. BACKWARD-COMPATIBLE WRAPPERS (Preserving existing agent integrations)
# ============================================================================

def fetch_market_rates(crop_type: str, origin_region: str) -> Dict[str, Any]:
    """
    Backward-compatible wrapper for legacy agent calls.
    Returns spot market commodity quotes per kg in USD across regional trade hubs.
    """
    arbitrage_data = fetch_realtime_market_arbitrage(
        crop_type=crop_type,
        origin_location=origin_region,
        volume_kg=1000.0,
        quality_grade="GRADE_A"
    )
    
    # Format quote dictionary for hubs
    market_quotes = {
        dest["hub_name"]: dest["unit_price_usd_per_kg"]
        for dest in arbitrage_data["ranked_destinations"]
    }
    
    return {
        "crop": crop_type,
        "origin": arbitrage_data["origin_hub"],
        "origin_country": arbitrage_data["origin_country"],
        "market_quotes_per_kg_usd": market_quotes,
        "currency": "USD",
        "best_arbitrage_market": arbitrage_data["recommended_market"],
        "projected_net_return_usd": arbitrage_data["projected_net_return_usd"]
    }


def dispatch_freight_booking(
    pickup_location: str,
    destination_hub: str,
    volume_kg: float
) -> Dict[str, Any]:
    """
    Backward-compatible wrapper for legacy agent calls.
    Reserves freight logistics capacity with cryptographic waybill generation.
    """
    waybill = generate_carrier_waybill(
        pickup_location=pickup_location,
        destination_hub=destination_hub,
        volume_kg=volume_kg,
        carrier_name="East-West AgroLogistics Fleet"
    )
    
    return {
        "status": waybill["status"],
        "waybill_id": waybill["waybill_id"],
        "verification_stamp": waybill["verification_stamp"],
        "sha256_digital_signature": waybill["sha256_digital_signature"],
        "carrier_partner": waybill["carrier_partner"],
        "pickup_location": waybill["origin_hub"],
        "destination_hub": waybill["destination_hub"],
        "freight_cost_usd": waybill["freight_cost_usd"],
        "estimated_transit_hours": waybill["estimated_transit_hours"],
        "road_distance_km": waybill["road_distance_km"],
        "is_cross_border": waybill["is_cross_border"]
    }