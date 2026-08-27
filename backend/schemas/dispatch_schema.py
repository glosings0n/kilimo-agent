"""
KilimoAgent Dispatch Schema Definitions

Strict Pydantic models for multimodal agricultural commodity arbitrage,
computer vision crop quality inspection, acoustic extraction, and freight logistics dispatch.
Configured for Gemini Structured Outputs and tool-calling execution.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class LanguageEnum(str, Enum):
    """Supported interface and voice languages for KilimoAgent."""
    SWAHILI = "sw"
    FRENCH = "fr"
    ENGLISH = "en"


class QualityGradeEnum(str, Enum):
    """Standardized quality grades for harvested agricultural commodities."""
    GRADE_A = "GRADE_A"
    GRADE_B = "GRADE_B"
    REJECTED = "REJECTED"


class CropQualityAssessment(BaseModel):
    """
    Computer vision inspection results evaluating crop quality, moisture level,
    and physical defects from uploaded specimen imagery.
    """
    specimen: str = Field(
        ...,
        description="Identified crop species or commodity name (e.g., 'Yellow Maize', 'Robusta Coffee Beans')."
    )
    physical_characteristics: str = Field(
        ...,
        description="Detailed visual analysis of color uniformity, grain morphology, kernel size, and appearance."
    )
    quality_grade: str = Field(
        ...,
        description="Assigned quality grade class: 'GRADE_A' (export/premium), 'GRADE_B' (standard domestic), or 'REJECTED'."
    )
    moisture_pct: float = Field(
        ...,
        description="Estimated moisture content percentage (e.g., 12.5% for optimal grain storage)."
    )
    moisture_rating: str = Field(
        ...,
        description="Qualitative assessment of moisture safety level (e.g., 'OPTIMAL', 'ACCEPTABLE', 'EXCESSIVE_MOISTURE')."
    )
    pest_infestation_pct: float = Field(
        ...,
        description="Estimated percentage of visible insect damage, weevil holes, or foreign matter contamination."
    )
    defect_summary: str = Field(
        ...,
        description="Summary of observed physical defects such as discoloration, broken kernels, mold spots, or debris."
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Computer vision model inference confidence score between 0.0 and 1.0."
    )


class SpokenAudioExtraction(BaseModel):
    """
    Acoustic voice note transcription and entity extraction capturing farmer harvest declarations.
    """
    is_audio_present: bool = Field(
        ...,
        description="True if an acoustic voice note was provided and analyzed; False if absent or text-only."
    )
    transcript_excerpt: str = Field(
        ...,
        description="Verbatim or key excerpt of the transcribed speech from the farmer, or 'Audio: None Provided'."
    )
    language_detected: str = Field(
        ...,
        description="Detected spoken language code or dialect (e.g., 'sw', 'fr', 'en', or 'none')."
    )
    declared_commodity: str = Field(
        ...,
        description="Commodity or crop name explicitly declared by the farmer in the voice note."
    )
    extracted_volume_kg: float = Field(
        ...,
        description="Harvest quantity or batch volume extracted from spoken speech in kilograms."
    )
    origin_depot: str = Field(
        ...,
        description="Farmer pickup location, village, or rural depot name extracted from speech."
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Acoustic transcription and Named Entity Recognition (NER) confidence score between 0.0 and 1.0."
    )


class MarketHubQuote(BaseModel):
    """
    Real-time spot price and freight logistics breakdown for a specific regional trading terminal.
    """
    hub_name: str = Field(
        ...,
        description="Name of the regional destination trading hub or wholesale terminal (e.g., 'Nairobi Terminal', 'Mombasa Port Hub')."
    )
    distance_km: float = Field(
        ...,
        description="One-way transit distance from the farmer origin depot to this market hub in kilometers."
    )
    spot_price_usd_per_kg: float = Field(
        ...,
        description="Current market spot buying price in USD per kilogram for the commodity grade."
    )
    gross_revenue_usd: float = Field(
        ...,
        description="Projected gross revenue in USD before transport deduction (Volume * Spot Price)."
    )
    freight_cost_usd: float = Field(
        ...,
        description="Calculated total freight and logistics transport cost to deliver batch to this hub in USD."
    )
    net_revenue_usd: float = Field(
        ...,
        description="Projected net revenue payout in USD after freight deduction (Gross Revenue - Freight Cost)."
    )
    is_optimal: bool = Field(
        ...,
        description="True if this hub delivers the maximum net arbitrage return among all candidate destinations."
    )
    notes: Optional[str] = Field(
        default=None,
        description="Optional intelligence notes regarding terminal demand, queue latency, or road conditions."
    )


class ArbitrageEvaluation(BaseModel):
    """
    Multi-hub arbitrage intelligence identifying the highest-yield destination market.
    """
    optimal_hub: str = Field(
        ...,
        description="Name of the highest-yield market hub selected for dispatch."
    )
    highest_net_payout_usd: float = Field(
        ...,
        description="Maximum net payout in USD achievable at the optimal destination terminal."
    )
    local_currency_payout: str = Field(
        ...,
        description="Formatted net payout in local regional currency string (e.g., 'KES 325,000', 'UGX 8,500,000', 'TZS 6,100,000')."
    )
    arbitrage_advantage_usd: float = Field(
        ...,
        description="Net monetary advantage in USD gained over the nearest local depot or runner-up alternative."
    )
    arbitrage_advantage_pct: float = Field(
        ...,
        description="Percentage margin improvement achieved through algorithmic arbitrage routing."
    )
    analyzed_hubs: List[MarketHubQuote] = Field(
        ...,
        description="Comparative financial and logistical quotes across all evaluated regional market hubs."
    )


class WaybillLogistics(BaseModel):
    """
    Autonomous freight booking confirmation, consignment details, and digital dispatch signature.
    """
    status: str = Field(
        default="DISPATCH_CONFIRMED",
        description="Dispatch confirmation status (e.g., 'DISPATCH_CONFIRMED', 'PENDING_CARRIER')."
    )
    waybill_id: str = Field(
        ...,
        description="Unique cryptographic freight waybill and consignment tracking identifier (e.g., 'WB-2026-NBO-8831')."
    )
    carrier_partner: str = Field(
        ...,
        description="Assigned logistics fleet carrier partner or freight transporter name."
    )
    pickup_location: str = Field(
        ...,
        description="Origin depot, farm gate, or cooperative collection center for cargo loading."
    )
    destination_hub: str = Field(
        ...,
        description="Final destination wholesale hub or grain silo terminal for offloading."
    )
    total_volume_kg: float = Field(
        ...,
        description="Total cargo weight booked and locked for transit in kilograms."
    )
    estimated_freight_cost_usd: float = Field(
        ...,
        description="Total freight expense locked with carrier partner in USD."
    )
    estimated_transit_hours: float = Field(
        ...,
        description="Projected transit and road transport duration in hours."
    )
    digital_signature: str = Field(
        ...,
        description="Autonomous agent cryptographic digital signature confirming booking authorization."
    )


class ExecutiveDispatchResponse(BaseModel):
    """
    Complete structured executive response payload orchestrating multimodal harvest inspection,
    market arbitrage intelligence, and autonomous freight dispatch.
    Used for Gemini Structured Outputs (response_schema=ExecutiveDispatchResponse).
    """
    transaction_id: str = Field(
        ...,
        description="Unique transaction session identifier for state checkpointing and Firestore sync."
    )
    farmer_id: str = Field(
        ...,
        description="Registered farmer identifier or cooperative member ID."
    )
    timestamp: str = Field(
        ...,
        description="ISO-8601 UTC timestamp of agent evaluation and dispatch completion."
    )
    language: str = Field(
        ...,
        description="Selected response language code: 'sw' (Swahili), 'fr' (Français), or 'en' (English)."
    )
    audio_extraction: SpokenAudioExtraction = Field(
        ...,
        description="Voice note transcription, language detection, and declared harvest entity extraction."
    )
    visual_inspection: CropQualityAssessment = Field(
        ...,
        description="Computer vision crop quality inspection, moisture estimation, and grading assessment."
    )
    market_arbitrage: ArbitrageEvaluation = Field(
        ...,
        description="Cross-terminal market price comparison and optimal arbitrage routing evaluation."
    )
    freight_dispatch: WaybillLogistics = Field(
        ...,
        description="Autonomous logistics booking, carrier assignment, waybill, and digital signature."
    )
    executive_summary: str = Field(
        ...,
        description="Concise executive narrative and audit trail explaining routing decisions, financial yield, and next steps."
    )
