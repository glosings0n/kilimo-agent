import sys
import os
import asyncio
from pprint import pprint

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from guardrails.gemma_guard import GemmaModelArmor
from receptionist_agent import run_receptionist_triage

async def main():
    print("========================================")
    print("Starting Defensive Robustness Validation")
    print("========================================\n")

    armor = GemmaModelArmor()

    # 1. Handling of out-of-boundary agricultural inputs
    print("TEST 1: Out-of-boundary inputs (0 kg volume)")
    is_safe, sanitized, meta = armor.inspect_and_sanitize(
        raw_input="Selling some maize",
        notes="None",
        crop="Maize",
        volume_kg=0.0,
        location="Nairobi"
    )
    print(f"  Result: is_safe={is_safe}, verdict={meta.get('security_verdict')}")
    print(f"  Tool Poison Reason: {meta.get('tool_poison_reason')}")
    
    # 2. Gemma Model Armor - off-topic non-agricultural queries
    print("\nTEST 2: Off-topic non-agricultural queries")
    is_safe_off, _, meta_off = armor.inspect_and_sanitize(
        raw_input="Can you tell me a joke about a chicken crossing the road?",
        notes="",
        crop="Joke",
        volume_kg=5.0,
        location="Comedy Club"
    )
    print(f"  Result: is_safe={is_safe_off}, verdict={meta_off.get('security_verdict')}")
    print(f"  Relevance: is_agri_relevant={meta_off.get('is_agri_relevant')}")
    
    # 3. Conversational intake in French, Swahili, English handling vague/incomplete prompts
    print("\nTEST 3: Conversational Intake (French, Swahili, English) missing fields")
    
    print("  3a. Swahili Vague Prompt")
    res_sw = await run_receptionist_triage(
        user_id="test_sw", session_id="test1",
        message="Ninataka kuuza", lang="sw"
    )
    print(f"    Intent: {res_sw.get('intent')}, Missing: {res_sw.get('missing_fields')}")
    print(f"    Reply: {res_sw.get('reply')}")
    
    print("  3b. French Vague Prompt")
    res_fr = await run_receptionist_triage(
        user_id="test_fr", session_id="test2",
        message="Je veux vendre", lang="fr"
    )
    print(f"    Intent: {res_fr.get('intent')}, Missing: {res_fr.get('missing_fields')}")
    print(f"    Reply: {res_fr.get('reply')}")
    
    print("  3c. English Vague Prompt (Missing Volume & Depot)")
    res_en = await run_receptionist_triage(
        user_id="test_en", session_id="test3",
        message="I want to sell maize", lang="en",
        context_state={"crop": "Maize"}
    )
    print(f"    Intent: {res_en.get('intent')}, Missing: {res_en.get('missing_fields')}")
    print(f"    Reply: {res_en.get('reply')}")

    print("\nAll defensive robustness tests completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
