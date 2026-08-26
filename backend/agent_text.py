import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

from tools.market_and_logistics import fetch_market_rates, dispatch_freight_booking
from state.firestore_manager import KilimoStateManager

load_dotenv()

# Standard Model & Platform configuration for Gemini Enterprise Agent Platform
MODEL_NAME = "gemini-3.6-flash"
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "kilimoagent")
# Global endpoint routing for Enterprise Model Catalog
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "global")

# Initialize Client with Enterprise Agent Platform routing enabled
client = genai.Client(
    enterprise=True,
    project=PROJECT_ID,
    location=LOCATION
)

SYSTEM_INSTRUCTION = """
You are KilimoAgent, an autonomous enterprise agent orchestrating agricultural commodity arbitrage and logistics fulfillment.

When triggered with a harvest payload:
1. Call `fetch_market_rates` to retrieve real-time spot commodity prices across candidate market hubs.
2. Calculate the net revenue arbitrage for each candidate market:
   - Net Revenue = (Volume * Market Price) - Estimated Freight Cost.
3. Identify the highest yield destination terminal.
4. Execute `dispatch_freight_booking` autonomously to book cargo transport for the harvest.
5. Return a structured executive ledger entry summarizing:
   - Optimal market selected with price justification.
   - Waybill ID and freight breakdown.
   - Projected gross revenue, freight expense, and net profit in USD.
"""

def process_harvest_request(farmer_id: str, crop: str, volume_kg: float, location: str) -> str:
    """
    Executes the end-to-end autonomous agentic workflow and updates Firestore checkpoints.
    """
    state_manager = KilimoStateManager(project_id=PROJECT_ID)
    
    # 1. State Checkpoint: Initialized
    tx_id = state_manager.initialize_transaction(
        farmer_id=farmer_id,
        initial_payload={"crop": crop, "volume_kg": volume_kg, "location": location}
    )
    print(f"[STATE] Transaction initialized: {tx_id}")
    
    # 2. State Checkpoint: Agent Execution
    state_manager.update_stage(tx_id, "RUNNING_AGENTIC_PIPELINE", {
        "model": MODEL_NAME,
        "location": LOCATION,
        "farmer_id": farmer_id
    })
    
    execution_prompt = (
        f"Farmer ID: {farmer_id}\n"
        f"Harvest Commodity: {crop}\n"
        f"Volume: {volume_kg} KG\n"
        f"Pickup Location: {location}\n"
        f"Task: Execute full market arbitrage and finalize logistics booking now."
    )
    
    # Create enterprise chat session with Automatic Function Calling (AFC)
    chat = client.chats.create(
        model=MODEL_NAME,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[fetch_market_rates, dispatch_freight_booking]
        )
    )
    
    response = chat.send_message(execution_prompt)
    
    # 3. State Checkpoint: Completed
    state_manager.complete_transaction(tx_id, {
        "agent_raw_output": response.text
    })
    print(f"[STATE] Transaction {tx_id} marked COMPLETED in Firestore.")
    
    return response.text

if __name__ == "__main__":
    print(f"=== Running KilimoAgent Autonomous Workflow ({MODEL_NAME} - Enterprise Global) ===")
    
    sample_output = process_harvest_request(
        farmer_id="FARMER-EAST-8092",
        crop="maize",
        volume_kg=1200.0,
        location="Bunia Agricultural Depot, IT-01"
    )
    
    print("\n=== Agent Final Outcome ===")
    print(sample_output)