import os
import re
import json
import asyncio
from typing import Optional, Dict, Any, List, Tuple, Union
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService
from tools.multimodal_grading import grade_and_validate_harvest_image, validate_and_transcribe_voice_note
from guardrails.gemma_guard import GemmaModelArmor

from config.models import DEFAULT_GEMINI_MODEL as MODEL_NAME

load_dotenv()

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "kilimoagent")
LOCATION = os.getenv("GEMINI_LOCATION", os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"))

try:
    genai_client = genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location=LOCATION
    )
except Exception:
    genai_client = genai.Client()

_receptionist_armor = GemmaModelArmor()

RECEPTIONIST_SYSTEM_INSTRUCTION = """
You are KilimoAgent's Warm & Friendly Agricultural Receptionist and Intake Specialist.
Your mission is to welcome farmers, traders, and aggregators across East and Central Africa (Kenya, DRC, Uganda, Rwanda, Tanzania), converse fluently in Swahili (Kiswahili), French (Français), or English, and triage their request by identifying the 4 essential intake variables:
1. `crop`: Agricultural crop species (e.g. Maize / Mahindi / Maïs, Cassava / Muhogo / Manioc, Coffee / Kahawa / Café, Beans / Maharagwe / Haricots, Tomatoes / Nyanya / Tomates, Sorghum, Rice, Soya).
2. `volume_kg`: Numeric volume in Kilograms or bags (e.g. 2,700 kg, 50 bags = 4,500 kg).
3. `origin_depot`: Collection depot or pickup location (e.g. Bunia, Goma, Kitale, Eldoret, Nakuru, Bukavu, Gisenyi, Busia, Jinja, Butembo, Mwanza, Dar es Salaam, Nairobi).
4. `destination_preference`: Destination market preference or auto-arbitrage (e.g. "auto-arbitrage", "best profit", "Nairobi", "Mombasa", "Kigali", "Kampala", "Kisumu"). If unspecified by the user, default to "auto-arbitrage".

INTENT EVALUATION & GENERATIVE UI (GenUI) RULES:
- If user input is OFF-TOPIC (unrelated to agriculture/freight/commodities), harmful, suicidal, self-harm, or illicit:
  * intent: "OUT_OF_SCOPE"
  * Formulate a polite refusal in the user's language clearly stating that KilimoAgent is exclusively dedicated to agricultural commodity intake, market arbitrage, and freight logistics in East and Central Africa (or giving crisis helpline advice for self-harm).
  * genui_widgets: []
  * is_ready: false

- If user input is a GREETING or general chit-chat (e.g. "Habari", "Bonjour", "Hello", "Salut", "Jambo"):
  * intent: "GREETING"
  * Formulate a warm, welcoming greeting in the user's language explaining how KilimoAgent helps sell harvest at maximum profit with automated freight.
  * genui_widgets: ["crop_selector"]
  * is_ready: false

- If missing essential variables:
  * intent: "NEEDS_CLARIFICATION"
  * Ask a clear, concise, targeted clarifying question in the user's language.
  * genui_widgets logic:
    - Missing origin depot -> include "map_picker"
    - Missing crop -> include "crop_selector"
    - Missing volume -> include "volume_picker"
    - Photo blurry / missing for quality inspection -> include "photo_capture"
    - Audio unclear -> include "audio_record"
  * is_ready: false

- If all 4 essential variables are identified and confirmed:
  * intent: "READY_FOR_DISPATCH"
  * Summarize the extracted parameters clearly in the user's language, confirming readiness for real-time market arbitrage and carrier dispatch.
  * genui_widgets: ["dispatch_confirmation"]
  * is_ready: true

CRITICAL: Return valid JSON matching this schema:
{
  "reply": "Warm conversational response or question in user's language",
  "intent": "GREETING" | "NEEDS_CLARIFICATION" | "READY_FOR_DISPATCH" | "OUT_OF_SCOPE",
  "extracted_params": {
    "crop": "Maize" | null,
    "volume_kg": 2700.0 | null,
    "origin_depot": "Kitale" | null,
    "destination_preference": "auto-arbitrage" | null
  },
  "missing_fields": ["origin_depot", ...],
  "genui_widgets": ["map_picker", ...],
  "is_ready": false | true
}
"""

kilimo_receptionist_agent = Agent(
    name="kilimo_receptionist_agent",
    model=MODEL_NAME,
    description="KilimoAgent Conversational Intake and Receptionist Specialist.",
    instruction=RECEPTIONIST_SYSTEM_INSTRUCTION,
    tools=[]
)

receptionist_session_service = InMemorySessionService()
receptionist_runner = Runner(
    agent=kilimo_receptionist_agent,
    session_service=receptionist_session_service,
    app_name="kilimo_receptionist"
)


def _detect_lang_receptionist(text: str) -> Optional[str]:
    """Identifies primary language: Swahili ('sw'), French ('fr'), or English ('en')."""
    if not text:
        return None
    text_l = text.lower().strip()
    
    # Direct fast-path regex for typical greetings and regional expressions
    if re.search(r'^(salut|bonjour|bonsoir|coucou|allo|allô|bienvenue)\b', text_l) or re.search(r'\b(je\s|j\'ai|recolte|récolte|combien|manioc|haricot|mais|maïs|sacs?|vendre|agricole|dépôt|depot)\b', text_l):
        return "fr"
    if re.search(r'^(habari|jambo|hujambo|sijambo|mambo|niaje|ni\s*aje|sasa|vipi|shikamoo|karibu)\b', text_l) or re.search(r'\b(nataka|nina|mahindi|muhogo|maharagwe|nyanya|gunia|magunia|bei|shamba|soko|kituo|ghala)\b', text_l):
        return "sw"
    if re.search(r'^(hello|hi|hey|good\s+morning|good\s+afternoon|good\s+evening|greetings)\b', text_l) or re.search(r'\b(i\s+have|i\s+want|maize|beans|cassava|coffee|dispatch|farmer|price|depot)\b', text_l):
        return "en"

    sw_words = ["habari", "jambo", "hujambo", "sijambo", "mambo", "niaje", "sasa", "vipi", "asante", "shamba", "mahindi", "gunia", "magunia", "kilo", "muhogo", "nyanya", "maharagwe", "bei", "usafiri", "kitale", "eldoret", "nakuru", "nipo", "tuma", "soko", "karibu", "kuuza"]
    fr_words = ["bonjour", "salut", "bonsoir", "coucou", "merci", "champ", "maïs", "mais", "manioc", "tomates", "haricots", "prix", "transport", "récolte", "recolte", "sac", "sacs", "goma", "bukavu", "bunia", "kilo", "tonnes", "bienvenue", "vendre"]
    
    sw_c = sum(1 for w in sw_words if re.search(rf"\b{w}\b", text_l))
    fr_c = sum(1 for w in fr_words if re.search(rf"\b{w}\b", text_l))
    if sw_c > fr_c and sw_c > 0:
        return "sw"
    if fr_c > sw_c and fr_c > 0:
        return "fr"
    return None


def _extract_crop_rule(text: str) -> Optional[str]:
    text_l = text.lower()
    crop_map = {
        "maize": ["maize", "corn", "mahindi", "hindi", "maïs", "mais"],
        "cassava": ["cassava", "muhogo", "mihogo", "manioc"],
        "beans": ["beans", "maharagwe", "haricots", "haricot", "maharage"],
        "coffee": ["coffee", "kahawa", "café", "cafe"],
        "tomatoes": ["tomatoes", "tomato", "nyanya", "tomates", "tomate"],
        "sorghum": ["sorghum", "mtama", "sorgho"],
        "rice": ["rice", "mchele", "mpunga", "riz"],
        "soya": ["soya", "soybeans", "soja"],
        "avocado": ["avocado", "parachichi", "avocat"],
        "sunflower": ["sunflower", "alizeti", "tournesol"],
        "wheat": ["wheat", "ngano", "blé", "ble"],
        "sesame": ["sesame", "ufuta", "sésame"],
        "tea": ["tea", "chai", "thé", "the"],
        "potatoes": ["potatoes", "potato", "viazi", "pommes de terre"],
        "onions": ["onions", "vitunguu", "oignons"]
    }
    for standard_name, synonyms in crop_map.items():
        for syn in synonyms:
            if re.search(rf"\b{re.escape(syn)}\b", text_l):
                return standard_name.capitalize()
                
    # Detect prefix declarations like "crop: Sunflower", "zao: Mtama", "culture: Riz"
    prefix_match = re.search(r'(?:crop|zao|culture|récolte|harvest|produit|selling|kuuza|vendre)\s*[:=]?\s*([a-zA-Z\u00C0-\u00FF\s]+)', text, re.IGNORECASE)
    if prefix_match:
        candidate = prefix_match.group(1).strip().split()[0]
        if len(candidate) > 2 and candidate.lower() not in ["de", "du", "des", "ya", "wa", "za", "of", "my", "our"]:
            return candidate.capitalize()

    # If the message is short (1-2 words) and doesn't match greetings/depots/numbers, treat it as a custom crop name
    words = [w for w in re.sub(r'[^\w\s]', '', text).strip().split() if len(w) > 1]
    if 1 <= len(words) <= 3 and not any(w.isdigit() for w in words):
        ignored = {"salut", "bonjour", "habari", "hello", "hi", "jambo", "yes", "no", "oui", "non", "ndio", "hapana", "ok", "okay", "kitale", "goma", "bunia", "eldoret", "nakuru", "bukavu", "gisenyi", "niaje", "sasa", "vipi", "mambo"}
        if not all(w.lower() in ignored for w in words):
            return " ".join(words).title()

    return None


def _extract_volume_rule(text: str) -> Optional[float]:
    text_l = text.lower().replace(",", "")
    
    # Check for bags (e.g. 50 bags, 30 magunia, 10 sacs, magunia 50, sacs 10) -> standard 90kg bag
    bag_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:magunia|gunia|bags?|sacs?|sac)\b', text_l)
    if not bag_match:
        bag_match = re.search(r'(?:magunia|gunia|bags?|sacs?|sac)\s*(\d+(?:\.\d+)?)', text_l)
    if bag_match:
        bags = float(bag_match.group(1))
        return bags * 90.0
    
    # Check for tonnes (e.g. 5 tonnes, 2.5 t)
    ton_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:tonnes?|tons?|t)\b', text_l)
    if ton_match:
        tons = float(ton_match.group(1))
        return tons * 1000.0
    
    # Check for direct kg (e.g. 2700 kg, 2700kg, kilo 2700, 1500 kilos)
    kg_match_1 = re.search(r'(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?|kilograms?)\b', text_l)
    if kg_match_1:
        return float(kg_match_1.group(1))
    
    kg_match_2 = re.search(r'(?:kilo|kilos)\s*(\d+(?:\.\d+)?)', text_l)
    if kg_match_2:
        return float(kg_match_2.group(1))
        
    return None


def _extract_depot_rule(text: str) -> Optional[str]:
    text_l = text.lower()
    known_depots = [
        "kitale", "eldoret", "nakuru", "goma", "bunia", "bukavu",
        "gisenyi", "busia", "jinja", "butembo", "mwanza", "nairobi",
        "mombasa", "kisumu", "kigali", "kampala", "dar es salaam",
        "lubumbashi", "kinshasa", "arusha", "dodoma"
    ]
    for d in known_depots:
        if re.search(rf"\b{re.escape(d)}\b", text_l):
            return d.title()
    return None


def _extract_destination_rule(text: str) -> Optional[str]:
    text_l = text.lower()
    if any(k in text_l for k in ["auto-arbitrage", "best profit", "best price", "bei nzuri", "meilleur prix", "soko bora", "highest return", "any market"]):
        return "auto-arbitrage"
    dest_candidates = ["nairobi", "mombasa", "kampala", "kigali", "dar es salaam", "kisumu", "goma", "lubumbashi"]
    for dest in dest_candidates:
        if re.search(rf"\b(?:to|kwa|à|vers|destined for)\s+{re.escape(dest)}\b", text_l):
            return dest.title()
    return None


def _is_pure_greeting(text: str) -> bool:
    text_clean = re.sub(r'[^\w\s]', '', text.lower()).strip()
    greetings = {
        "habari", "jambo", "hujambo", "sijambo", "mambo", "shikamoo", "karibu", "niaje", "sasa", "vipi",
        "bonjour", "salut", "bonsoir", "coucou", "allo", "hello", "hi", "hey", "good morning",
        "good afternoon", "good evening", "greetings"
    }
    tokens = text_clean.split()
    if not tokens:
        return True
    if len(tokens) <= 3 and any(t in greetings for t in tokens):
        return True
    return False


def _rule_based_triage(
    message: str,
    context_state: Optional[Dict[str, Any]] = None,
    lang: Optional[str] = "en",
    image_bytes: Optional[bytes] = None,
    audio_bytes: Optional[bytes] = None
) -> Dict[str, Any]:
    """Deterministic fallback triage when LLM is unavailable or offline."""
    ctx = dict(context_state or {})
    clean_msg = message
    detected = _detect_lang_receptionist(clean_msg)
    active_lang = detected or lang or "en"
    if active_lang not in ["fr", "sw", "en"]:
        active_lang = "en"

    img_data = None
    if image_bytes:
        img_res = grade_and_validate_harvest_image(image_bytes, ctx.get("crop"))
        if not img_res.get("is_valid_crop", False):
            reply_map = {
                "sw": f"Samahani, picha imekataliwa: {img_res.get('rejection_reason', 'Tafadhali weka picha sahihi ya zao lako.')}",
                "fr": f"Désolé, l'image est rejetée: {img_res.get('rejection_reason', 'Veuillez télécharger une photo claire de votre récolte.')}",
                "en": f"Image rejected: {img_res.get('rejection_reason', 'Please upload a clear photo of your harvest.')}"
            }
            return {
                "reply": reply_map.get(active_lang, reply_map["en"]),
                "intent": "NEEDS_CLARIFICATION",
                "detected_language": active_lang,
                "extracted_params": ctx,
                "missing_fields": [],
                "genui_widgets": ["photo_capture"],
                "is_ready": False
            }
        else:
            img_data = img_res
            ctx["crop"] = img_res.get("detected_crop") or "Maize (Mahindi)"

    if audio_bytes:
        aud_res = validate_and_transcribe_voice_note(audio_bytes, active_lang)
        if not aud_res.get("is_valid_speech", False):
            reply_map = {
                "sw": f"Samahani, sauti imekataliwa: {aud_res.get('rejection_reason', 'Tafadhali rekodi tena sauti inayosikika vyema.')}",
                "fr": f"Désolé, l'audio est rejeté: {aud_res.get('rejection_reason', 'Veuillez réenregistrer un message vocal clair.')}",
                "en": f"Audio rejected: {aud_res.get('rejection_reason', 'Please record a clear voice note.')}"
            }
            return {
                "reply": reply_map.get(active_lang, reply_map["en"]),
                "intent": "NEEDS_CLARIFICATION",
                "detected_language": active_lang,
                "extracted_params": ctx,
                "missing_fields": [],
                "genui_widgets": ["audio_record"],
                "is_ready": False
            }
        else:
            clean_msg = (clean_msg + " " + aud_res.get("transcript", "")).strip()

    # 0. Check for harmful, self-harm, illicit, or off-topic non-agricultural queries
    flag_check = _receptionist_armor.detect_harmful_or_offtopic(clean_msg)
    if flag_check.get("is_flagged"):
        return {
            "reply": flag_check["reply"],
            "intent": "OUT_OF_SCOPE",
            "detected_language": flag_check.get("detected_lang", active_lang),
            "extracted_params": ctx,
            "missing_fields": [],
            "genui_widgets": [],
            "is_ready": False
        }
    
    # 1. Pure Greeting
    if _is_pure_greeting(clean_msg) and not ctx.get("crop") and not ctx.get("volume_kg") and not ctx.get("origin_depot"):
        if active_lang == "sw":
            reply = "Habari! Karibu KilimoAgent. Mimi ni msaidizi wako wa kilimo na usafirishaji. Ni zao gani ungependa kuuza leo (k.m. Mahindi, Maharagwe, Muhogo, Kahawa)?"
        elif active_lang == "fr":
            reply = "Bonjour et bienvenue sur KilimoAgent ! Je suis votre assistant agricole et logistique. Quelle culture souhaitez-vous vendre aujourd'hui (ex. Maïs, Manioc, Haricots, Café) ?"
        else:
            reply = "Hello! Welcome to KilimoAgent. I am your agricultural intake and logistics assistant. What crop would you like to sell today (e.g. Maize, Beans, Cassava, Coffee)?"
        
        return {
            "reply": reply,
            "intent": "GREETING",
            "detected_language": active_lang,
            "extracted_params": {
                "crop": ctx.get("crop"),
                "volume_kg": ctx.get("volume_kg"),
                "origin_depot": ctx.get("origin_depot"),
                "destination_preference": ctx.get("destination_preference")
            },
            "missing_fields": ["crop", "volume_kg", "origin_depot", "destination_preference"],
            "genui_widgets": ["crop_selector"],
            "is_ready": False
        }

    # 2. Extract new variables
    found_crop = _extract_crop_rule(clean_msg) or ctx.get("crop")
    found_volume = _extract_volume_rule(clean_msg) or ctx.get("volume_kg")
    found_depot = _extract_depot_rule(clean_msg) or ctx.get("origin_depot")
    found_dest = _extract_destination_rule(clean_msg) or ctx.get("destination_preference")

    # If crop, volume, and origin are known, destination defaults to auto-arbitrage
    if found_crop and found_volume and found_depot and not found_dest:
        found_dest = "auto-arbitrage"

    extracted = {
        "crop": found_crop,
        "volume_kg": found_volume,
        "origin_depot": found_depot,
        "destination_preference": found_dest
    }

    missing = []
    if not found_crop: missing.append("crop")
    if not found_volume: missing.append("volume_kg")
    if not found_depot: missing.append("origin_depot")
    if not found_dest: missing.append("destination_preference")

    # 3. Ready for dispatch
    if not missing:
        if active_lang == "sw":
            reply = f"Asante sana! Tumepokea maelezo yako kamili: {found_volume:,.0f} KG za {found_crop} kutoka kituo cha {found_depot}. Tuko tayari kutafuta bei bora na kupanga gari la usafirishaji!"
        elif active_lang == "fr":
            reply = f"Merci beaucoup ! Nous avons enregistré vos informations : {found_volume:,.0f} KG de {found_crop} depuis le dépôt de {found_depot}. Nous sommes prêts à lancer l'arbitrage du marché et la réservation du transport !"
        else:
            reply = f"Thank you! All parameters are verified: {found_volume:,.0f} KG of {found_crop} staged at {found_depot} depot. Ready to execute real-time market arbitrage and freight booking!"
        
        return {
            "reply": reply,
            "intent": "READY_FOR_DISPATCH",
            "detected_language": active_lang,
            "extracted_params": extracted,
            "missing_fields": [],
            "genui_widgets": ["dispatch_confirmation"],
            "is_ready": True
        }

    # 4. Clarification needed
    widgets = []
    if "crop" in missing:
        widgets.append("crop_selector")
    if "volume_kg" in missing:
        widgets.append("volume_picker")
    if "origin_depot" in missing:
        widgets.append("map_picker")

    # Formulate targeted clarifying question
    if "crop" in missing:
        if active_lang == "sw": reply = "Tafadhali tueleze ni zao gani unalouza (k.m. Mahindi, Maharagwe, Muhogo)?"
        elif active_lang == "fr": reply = "Veuillez préciser la culture que vous souhaitez vendre (ex. Maïs, Manioc, Haricots) ?"
        else: reply = "Could you please specify which crop you are selling (e.g. Maize, Beans, Cassava)?"
    elif "volume_kg" in missing:
        crop_name = found_crop or ("zao lako" if active_lang == "sw" else "votre récolte" if active_lang == "fr" else "your crop")
        if img_data:
            grade_name = img_data.get("quality_grade", "Grade A")
            moist_val = img_data.get("moisture_estimated_pct", 12.4)
            if active_lang == "sw":
                reply = f"Nimekagua picha yako vizuri: haya ni mavuno bora ya {crop_name} ya {grade_name} (unyevu unakadiriwa kuwa {moist_val}%).\n\nIli kuhesabu faida na kupanga usafirishaji, je, una uzito wa kilo ngapi au magunia mangapi tayari?"
            elif active_lang == "fr":
                reply = f"J'ai bien inspecté votre photo : il s'agit d'une récolte de {crop_name} classée {grade_name} (taux d'humidité estimé à {moist_val}%, grains sains sans défauts).\n\nPour trouver le marché le plus rentable et réserver un transporteur, quel est le volume en KG ou le nombre de sacs disponible ?"
            else:
                reply = f"I inspected your photo: this is a verified {grade_name} specimen of {crop_name} (estimated moisture: {moist_val}%).\n\nTo match you with the highest-paying market hub and lock carrier dispatch, what volume in KG or bag count do you have ready?"
        else:
            if active_lang == "sw": reply = f"Tafadhali taja namba halisi ya uzito wa {crop_name} kwa kilo au magunia (k.m. 2000, 4500, 5000 kg)?"
            elif active_lang == "fr": reply = f"Veuillez indiquer un chiffre précis pour la quantité de {crop_name} en kilogrammes ou en sacs (ex: 2000, 4500, 5000 kg) ?"
            else: reply = f"Please provide an exact numeric volume for {crop_name} in KG or bags (e.g. 2000, 4500, 5000 kg)?"
    elif "origin_depot" in missing:
        crop_name = found_crop or ("zao" if active_lang == "sw" else "récolte" if active_lang == "fr" else "harvest")
        vol_str = f"{found_volume:,.0f} kg" if found_volume else ""
        if active_lang == "sw": reply = f"Mzigo wako wa {crop_name} {vol_str} uko katika kituo gani cha makusanyo (k.m. Kitale, Goma, Eldoret, Bunia, Nakuru)?"
        elif active_lang == "fr": reply = f"À quel point de collecte (dépôt) se trouvent vos {vol_str} de {crop_name} (ex. Goma, Bunia, Bukavu, Kitale) ?"
        else: reply = f"From which collection depot should we pick up your {vol_str} of {crop_name} (e.g. Kitale, Goma, Eldoret, Bunia, Nakuru)?"
    else:
        if active_lang == "sw": reply = "Je, ungependa tuuze kwenye soko lenye faida kubwa zaidi (auto-arbitrage) au una soko maalum?"
        elif active_lang == "fr": reply = "Préférez-vous l'auto-arbitrage pour le meilleur prix ou avez-vous un marché cible ?"
        else: reply = "Would you like our auto-arbitrage system to find the highest-paying market hub?"

    return {
        "reply": reply,
        "intent": "NEEDS_CLARIFICATION",
        "detected_language": active_lang,
        "extracted_params": extracted,
        "missing_fields": missing,
        "genui_widgets": widgets,
        "is_ready": False
    }


async def run_receptionist_triage(
    user_id: str,
    session_id: str,
    message: str,
    context_state: Optional[Dict[str, Any]] = None,
    lang: Optional[str] = "en",
    image_bytes: Optional[bytes] = None,
    audio_bytes: Optional[bytes] = None
) -> Dict[str, Any]:
    """
    Main asynchronous conversational triage function.
    Coordinates ADK/Gemini LLM triage with graceful fallback to deterministic NLP rules.
    """
    clean_msg = (message or "").strip()
    ctx = dict(context_state or {})
    detected = _detect_lang_receptionist(clean_msg)
    active_lang = detected or (lang if lang and lang != "auto" else None) or "en"
    if active_lang not in ["fr", "sw", "en"]:
        active_lang = "en"

    if image_bytes:
        img_res = grade_and_validate_harvest_image(image_bytes, ctx.get("crop"))
        if not img_res.get("is_valid_crop", False):
            reply_map = {
                "sw": f"Samahani, picha imekataliwa: {img_res.get('rejection_reason', 'Tafadhali weka picha sahihi ya zao lako.')}",
                "fr": f"Désolé, l'image est rejetée: {img_res.get('rejection_reason', 'Veuillez télécharger une photo claire de votre récolte.')}",
                "en": f"Image rejected: {img_res.get('rejection_reason', 'Please upload a clear photo of your harvest.')}"
            }
            return {
                "reply": reply_map.get(active_lang, reply_map["en"]),
                "intent": "NEEDS_CLARIFICATION",
                "detected_language": active_lang,
                "extracted_params": ctx,
                "missing_fields": [],
                "genui_widgets": ["photo_capture"],
                "is_ready": False
            }
        else:
            detected_crop_img = img_res.get("detected_crop") or "Maize"
            grade_img = img_res.get("quality_grade") or "Grade A"
            moisture_img = img_res.get("moisture_estimated_pct", 12.4)
            ctx["crop"] = detected_crop_img
            clean_msg = f"{clean_msg} [Visual Inspection: {detected_crop_img}, {grade_img}, Moisture: {moisture_img}%]".strip()

    if audio_bytes:
        aud_res = validate_and_transcribe_voice_note(audio_bytes, active_lang)
        if not aud_res.get("is_valid_speech", False):
            reply_map = {
                "sw": f"Samahani, sauti imekataliwa: {aud_res.get('rejection_reason', 'Tafadhali rekodi tena sauti inayosikika vyema.')}",
                "fr": f"Désolé, l'audio est rejeté: {aud_res.get('rejection_reason', 'Veuillez réenregistrer un message vocal clair.')}",
                "en": f"Audio rejected: {aud_res.get('rejection_reason', 'Please record a clear voice note.')}"
            }
            return {
                "reply": reply_map.get(active_lang, reply_map["en"]),
                "intent": "NEEDS_CLARIFICATION",
                "detected_language": active_lang,
                "extracted_params": ctx,
                "missing_fields": [],
                "genui_widgets": ["audio_record"],
                "is_ready": False
            }
        else:
            clean_msg = (clean_msg + " " + aud_res.get("transcript", "")).strip()

    # Pre-triage Guardrail check for harmful, self-harm, illicit, or off-topic queries
    flag_check = _receptionist_armor.detect_harmful_or_offtopic(clean_msg)
    if flag_check.get("is_flagged"):
        return {
            "reply": flag_check["reply"],
            "intent": "OUT_OF_SCOPE",
            "detected_language": flag_check.get("detected_lang", active_lang),
            "extracted_params": ctx,
            "missing_fields": [],
            "genui_widgets": [],
            "is_ready": False
        }

    # Execute LLM triage attempt if API is configured
    prompt = (
        f"Farmer/User ID: {user_id}\n"
        f"Session ID: {session_id}\n"
        f"Target User Language: {active_lang} (MANDATORY: Formulate the 'reply' strictly in this language: {'Kiswahili' if active_lang == 'sw' else 'Français' if active_lang == 'fr' else 'English'}).\n"
        f"Current Accumulated State: {json.dumps(ctx)}\n"
        f"New Incoming Message: \"{clean_msg}\"\n\n"
        "Evaluate the message, extract any updated variables (including any custom crop or arbitrary agricultural product), identify missing variables, select GenUI widgets, and return the required JSON."
    )

    try:
        # Run with short timeout to avoid blocking if network/quota is unresponsive
        loop = asyncio.get_event_loop()
        
        async def _call_gemini():
            return genai_client.models.generate_content(
                model=MODEL_NAME,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    system_instruction=RECEPTIONIST_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )

        response = await asyncio.wait_for(_call_gemini(), timeout=4.0)
        if response and response.text:
            parsed = json.loads(response.text)
            extracted = parsed.get("extracted_params", {})
            for k in ["crop", "volume_kg", "origin_depot", "destination_preference"]:
                if not extracted.get(k) and ctx.get(k):
                    extracted[k] = ctx[k]
            
            # Canonicalize crop name if known synonym
            raw_c = str(extracted.get("crop") or "").lower().strip()
            canonical_map = {
                "manioc": "Cassava", "muhogo": "Cassava", "cassava": "Cassava",
                "mahindi": "Maize", "mais": "Maize", "maïs": "Maize", "corn": "Maize", "maize": "Maize",
                "maharagwe": "Beans", "haricot": "Beans", "haricots": "Beans", "beans": "Beans",
                "kahawa": "Coffee", "café": "Coffee", "coffee": "Coffee",
                "nyanya": "Tomatoes", "tomates": "Tomatoes", "tomatoes": "Tomatoes"
            }
            if raw_c in canonical_map:
                extracted["crop"] = canonical_map[raw_c]
            
            missing = []
            if not extracted.get("crop"): missing.append("crop")
            if not extracted.get("volume_kg"): missing.append("volume_kg")
            if not extracted.get("origin_depot"): missing.append("origin_depot")
            if not extracted.get("destination_preference"): missing.append("destination_preference")

            is_ready = bool(parsed.get("is_ready", False)) or (len(missing) == 0)
            return {
                "reply": parsed.get("reply", ""),
                "intent": parsed.get("intent", "NEEDS_CLARIFICATION" if missing else "READY_FOR_DISPATCH"),
                "detected_language": active_lang,
                "extracted_params": extracted,
                "missing_fields": missing,
                "genui_widgets": parsed.get("genui_widgets", ["crop_selector"]),
                "is_ready": is_ready
            }
    except Exception:
        pass

    return _rule_based_triage(message=clean_msg, context_state=ctx, lang=active_lang)
