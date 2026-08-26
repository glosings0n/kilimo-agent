import uuid
from typing import Dict, Any

def fetch_market_rates(crop_type: str, origin_region: str) -> Dict[str, Any]:
    """
    Fetches real-time spot market commodity prices across regional trade hubs.
    
    Args:
        crop_type: Agricultural commodity (e.g., maize, cassava, tomatoes, beans).
        origin_region: Production hub or pickup region.
    """
    normalized_crop = crop_type.strip().lower()
    
    # Realistic regional pricing index per kg in USD/Local units
    pricing_catalog = {
        "maize": {
            "Central_Market_Hub": 0.38,
            "Border_Trade_Zone": 0.45,
            "Coastal_Wholesale_Terminal": 0.42,
        },
        "cassava": {
            "Central_Market_Hub": 0.22,
            "Border_Trade_Zone": 0.29,
            "Coastal_Wholesale_Terminal": 0.26,
        },
        "tomatoes": {
            "Central_Market_Hub": 0.70,
            "Border_Trade_Zone": 0.85,
            "Coastal_Wholesale_Terminal": 0.90,
        },
        "beans": {
            "Central_Market_Hub": 0.65,
            "Border_Trade_Zone": 0.80,
            "Coastal_Wholesale_Terminal": 0.75,
        }
    }
    
    rates = pricing_catalog.get(
        normalized_crop,
        {"Default_Regional_Hub": 0.30}
    )
    
    return {
        "crop": crop_type,
        "origin": origin_region,
        "market_quotes_per_kg_usd": rates,
        "currency": "USD"
    }


def dispatch_freight_booking(
    pickup_location: str,
    destination_hub: str,
    volume_kg: float
) -> Dict[str, Any]:
    """
    Reserves freight logistics capacity with verified local transport carriers.
    
    Args:
        pickup_location: Origin address or regional collection center.
        destination_hub: Target wholesale market terminal.
        volume_kg: Total gross weight of the harvested crop in kilograms.
    """
    base_rate_per_kg = 0.04
    estimated_freight_cost = round(volume_kg * base_rate_per_kg, 2)
    tracking_id = f"KILIMO-WB-{uuid.uuid4().hex[:8].upper()}"
    
    return {
        "status": "DISPATCH_CONFIRMED",
        "waybill_id": tracking_id,
        "carrier_partner": "East-West AgroLogistics Fleet",
        "pickup_location": pickup_location,
        "destination_hub": destination_hub,
        "freight_cost_usd": estimated_freight_cost,
        "estimated_transit_hours": 6
    }