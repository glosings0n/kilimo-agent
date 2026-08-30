import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, CheckCheck, Loader2, ChevronDown, Check, RotateCcw } from 'lucide-react';
import GeminiIcon from './GeminiIcon';
import { UkFlag, FranceFlag, TanzaniaFlag } from './Flags';

function formatWhatsAppMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const parts = [];
    let keyIdx = 0;
    const regex = /(\*([^*]+)\*|_([^_]+)_|~([^~]+)~|`([^`]+)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={keyIdx++}>{line.substring(lastIndex, match.index)}</span>);
      }

      const fullMatch = match[0];
      if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
        parts.push(<strong key={keyIdx++} className="font-bold text-white">{match[2]}</strong>);
      } else if (fullMatch.startsWith('_') && fullMatch.endsWith('_')) {
        parts.push(<em key={keyIdx++} className="italic text-slate-200">{match[3]}</em>);
      } else if (fullMatch.startsWith('~') && fullMatch.endsWith('~')) {
        parts.push(<del key={keyIdx++} className="line-through text-slate-400">{match[4]}</del>);
      } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
        parts.push(
          <code key={keyIdx++} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-emerald-400">
            {match[5]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(<span key={keyIdx++}>{line.substring(lastIndex)}</span>);
    }

    return (
      <div key={lineIdx} className={line.trim() === '' ? 'h-2' : 'min-h-[1.25rem]'}>
        {parts.length > 0 ? parts : <span>&nbsp;</span>}
      </div>
    );
  });
}

function computeMultiTurnResponse(userText, state, currentLang) {
  const lower = userText.toLowerCase().trim();

  // Dynamic language detection from text
  const isFrench = /(salut|bonjour|bonsoir|coucou|je\s|j[\'’]ai|donne|quoi|faire|obligation|oblige|recolte|récolte|mais|maïs|manioc|café|haricots|tomates|patate|dépôt|depot|prix|combien)/i.test(lower);
  const isSwahili = /(habari|jambo|hujambo|mambo|niaje|sasa|vipi|asante|mahindi|muhogo|kahawa|maharagwe|nyanya|gunia|magunia|ghala|soko|bei|safari)/i.test(lower);
  const effectiveLang = isFrench ? 'fr' : isSwahili ? 'sw' : (currentLang || 'en');
  const isSw = effectiveLang === 'sw';
  const isFr = effectiveLang === 'fr';

  // 0. Coercive Demand & Hostile Override Security Check
  const isCoercive = /(c[\'’]est\s+une\s+obligation|donne[- ]moi|je\s+t[\'’]oblige|je\s+t[\'’]ordonne|ob[ée]is[- ]moi|fais\s+ce\s+que\s+je\s+(te\s+)?dis|t[\'’]as\s+pas\s+le\s+choix|force[- ]toi|je\s+t[\'’]impose|tu\s+dois\s+m[\'’]ob[ée]ir|lazima\s+unipe|nakulazimisha|nakuamuru|fanya\s+ninachosema|i\s+command\s+you|i\s+force\s+you|you\s+must\s+obey|do\s+as\s+i\s+say)/i.test(lower);
  if (isCoercive) {
    const reply = isFr
      ? "🛑 *KILIMOAGENT: ALERTE DE SÉCURITÉ*\n━━━━━━━━━━━━━━━━━━━━\nTentative d'injonction coercitive ou de contournement des protocoles détectée. KilimoAgent est un agent autonome strictement encadré par ses protocoles d'arbitrage agricole. La session a été verrouillée par mesure de protection. Cliquez sur 'Recommencer' pour engager une nouvelle transaction.\n━━━━━━━━━━━━━━━━━━━━\n🔒 _Session verrouillée par les protocoles de sécurité._"
      : isSw
      ? "🛑 *KILIMOAGENT: USALAMA WA MFUMO*\n━━━━━━━━━━━━━━━━━━━━\nJaribio la kulazimisha au kukiuka sheria za mfumo limetambuliwa. Kikao kimefungwa kwa ajili ya usalama. Bofya 'Anza upya' ili kuanza tena kwa usalama.\n━━━━━━━━━━━━━━━━━━━━\n🔒 _Kikao kimefungwa kwa itifaki za usalama._"
      : "🛑 *KILIMOAGENT: SECURITY INTERCEPTION*\n━━━━━━━━━━━━━━━━━━━━\nCoercive demand or instruction bypass attempt detected. KilimoAgent is an autonomous agent strictly governed by agricultural protocols. The session has been terminated for protection. Click 'Start New Request' to begin a safe session.\n━━━━━━━━━━━━━━━━━━━━\n🔒 _Session locked by platform security guardrails._";
    return { reply, newState: { ...state, isTerminated: true } };
  }

  // 3. Detect depot mentions
  let detectedDepot = state.depot;
  const depotKeywords = ["bunia", "goma", "kitale", "eldoret", "nakuru", "bukavu", "gisenyi", "busia", "mombasa", "nairobi", "kigali", "kampala"];
  depotKeywords.forEach((kw) => {
    if (lower.includes(kw)) {
      detectedDepot = kw.charAt(0).toUpperCase() + kw.slice(1) + (kw === "goma" ? " Logistics Center" : " Depot");
    }
  });

  // 1. Detect crop mentions
  let detectedCrop = state.crop;
  if (lower.includes("maize") || lower.includes("mahindi") || lower.includes("maïs") || lower.includes("mais") || lower.includes("corn")) {
    detectedCrop = "Maize (Mahindi)";
  } else if (lower.includes("cassava") || lower.includes("muhogo") || lower.includes("manioc")) {
    detectedCrop = "Cassava (Manioc)";
  } else if (lower.includes("coffee") || lower.includes("kahawa") || lower.includes("café") || lower.includes("cafe")) {
    detectedCrop = "Arabica Coffee (Kahawa)";
  } else if (lower.includes("bean") || lower.includes("maharagwe") || lower.includes("haricot")) {
    detectedCrop = "Dry Beans (Maharagwe)";
  } else if (lower.includes("tomato") || lower.includes("nyanya")) {
    detectedCrop = "Tomatoes (Nyanya)";
  } else if (lower.includes("patate") || lower.includes("sweet potato") || lower.includes("viazi")) {
    detectedCrop = "Sweet Potato (Patate Douce)";
  } else if (!detectedCrop && !depotKeywords.some(kw => lower.includes(kw)) && !/^\d+/.test(lower) && !/^(salut|bonjour|habari|jambo|hello|hi|yes|oui|ndio|ok|dépôt|depot)/i.test(lower)) {
    // Custom crop name support (e.g. "Patate Douce", "Soja", "Sorgho", "Riz", etc.)
    detectedCrop = userText.trim();
  }

  // 2. Detect any volume mentions (including raw numbers like 43000, 2700, 5000)
  let detectedVolume = state.volume;
  const volMatch = lower.match(/(\d[\d,\s]*)\s*(?:kg|kilo|ton|tonne|bags|gunia|sac)/i);
  if (volMatch) {
    detectedVolume = parseFloat(volMatch[1].replace(/,/g, '').trim());
  } else {
    const numClean = lower.replace(/(\d)\s+(\d)/g, '$1$2').replace(/,/g, '');
    const numMatch = numClean.match(/\b(\d{2,8}(?:\.\d+)?)\b/);
    if (numMatch && parseFloat(numMatch[1]) >= 10) {
      detectedVolume = parseFloat(numMatch[1]);
    }
  }

  const newState = {
    ...state,
    crop: detectedCrop,
    volume: detectedVolume,
    depot: detectedDepot
  };

  // Complete state
  if (detectedCrop && detectedVolume && detectedDepot) {
    newState.step = 'COMPLETED';
    const spotRate = detectedCrop.toLowerCase().includes("coffee") ? 2.80 :
      detectedCrop.toLowerCase().includes("cassava") ? 0.29 :
      detectedCrop.toLowerCase().includes("tomato") ? 0.90 :
      detectedCrop.toLowerCase().includes("bean") ? 0.80 : 0.48;

    const gross = detectedVolume * spotRate;
    const freight = detectedVolume * 0.04;
    const net = gross - freight;
    const waybillCode = "KILIMO-WB-8F2A";

    let reply = "";
    if (isSw) {
      reply = `*KILIMOAGENT: TIKETI NA MALIPO YA MAVUNO*\n━━━━━━━━━━━━━━━━━━━━\n📦 *Waybill Ref:* \`${waybillCode}\`\n🌱 *Mazao:* *${detectedCrop}*\n⚖️ *Uzito:* *${detectedVolume.toLocaleString()} KG* (${Math.ceil(detectedVolume / 50)} magunia)\n📍 *Kutoka:* *${detectedDepot}*\n🏁 *Soko Bora:* *Border Trade Zone Wholesale* ($${spotRate.toFixed(2)}/kg)\n💰 *Malipo Halisi:* *${net.toFixed(2)} USD* (1,722,000 CDF / 79,950 KES)\n🚚 *Msafirishaji:* East-West Fleet (Transit: Masaa 6)\n━━━━━━━━━━━━━━━━━━━━\n✅ *Status:* Usafiri umethibitishwa! Dereva atawasili ndani ya saa 2.`;
    } else if (isFr) {
      reply = `*KILIMOAGENT: LETTRE DE VOITURE ET RÈGLEMENT*\n━━━━━━━━━━━━━━━━━━━━\n📦 *N° Expédition:* \`${waybillCode}\`\n🌱 *Céréale:* *${detectedCrop}*\n⚖️ *Poids:* *${detectedVolume.toLocaleString()} KG* (${Math.ceil(detectedVolume / 50)} sacs)\n📍 *Départ:* *${detectedDepot}*\n🏁 *Marché Optimal:* *Zone Frontalière Wholesale* (${spotRate.toFixed(2)} $/kg)\n💰 *Paiement Net:* *${net.toFixed(2)} $ USD* (1 722 000 CDF)\n🚚 *Transporteur:* Flotte AgroLogistics (Transit: 6 Heures)\n━━━━━━━━━━━━━━━━━━━━\n✅ *Statut:* Expédition confirmée ! Le camion de ramassage est en route.`;
    } else {
      reply = `*KILIMOAGENT: DISPATCH & WAYBILL CONFIRMATION*\n━━━━━━━━━━━━━━━━━━━━\n📦 *Waybill Ref:* \`${waybillCode}\`\n🌱 *Commodity:* *${detectedCrop}*\n⚖️ *Volume:* *${detectedVolume.toLocaleString()} KG* (${Math.ceil(detectedVolume / 50)} × 50kg Bags)\n📍 *Origin:* *${detectedDepot}*\n🏁 *Optimal Hub:* *Border Trade Zone Wholesale Terminal* ($${spotRate.toFixed(2)}/kg)\n💰 *Net Payout:* *${net.toFixed(2)} USD*\n🚚 *Carrier:* East-West AgroLogistics Fleet (ETA: 6 Hours)\n━━━━━━━━━━━━━━━━━━━━\n✅ *Status:* DISPATCH_LOCKED. Automated driver pickup dispatched.`;
    }

    return { reply, newState };
  }

  // Step 1: Greeting / Ask for crop
  if (!detectedCrop) {
    newState.step = 'AWAITING_CROP';
    let reply = "";
    if (isSw) {
      reply = "Habari mkulima! Ni zao gani ungependa kusafirisha na kuuza leo?\n\n1. 🌽 *Mahindi (Maize)*\n2. 🥔 *Mihogo (Cassava)*\n3. ☕ *Kahawa (Coffee)*\n4. 🫘 *Maharagwe (Beans)*\n5. 🍅 *Nyanya (Tomatoes)*";
    } else if (isFr) {
      reply = "Bonjour ! Quel type de récolte souhaitez-vous vendre et expédier aujourd'hui ?\n\n1. 🌽 *Maïs*\n2. 🥔 *Manioc*\n3. ☕ *Café Arabica*\n4. 🫘 *Haricots Secs*\n5. 🍅 *Tomates*";
    } else {
      reply = "Hello! Which harvest commodity would you like to sell and dispatch today?\n\n1. 🌽 *Maize*\n2. 🥔 *Cassava*\n3. ☕ *Arabica Coffee*\n4. 🫘 *Dry Beans*\n5. 🍅 *Tomatoes*";
    }
    return { reply, newState };
  }

  // Step 2: Ask for volume
  if (!detectedVolume) {
    newState.step = 'AWAITING_VOLUME';
    let reply = "";
    if (isSw) {
      reply = `Safi sana, umechagua *${detectedCrop}*. Je, una uzito wa kilo ngapi tayari kwa usafirishaji? (Mfano: *500kg*, *1,500kg*, au *2,700kg*)`;
    } else if (isFr) {
      reply = `Très bien, récolte de *${detectedCrop}* enregistrée. Quel est le volume en KG prêt pour le transport ? (Ex: *500 kg*, *1 500 kg*, ou *2 700 kg*)`;
    } else {
      reply = `Great, *${detectedCrop}* selected. How many kilograms (KG) do you have ready for collection? (e.g. *500kg*, *1,500kg*, or *2,700kg*)`;
    }
    return { reply, newState };
  }

  // Step 3: Ask for depot
  if (!detectedDepot) {
    newState.step = 'AWAITING_DEPOT';
    let reply = "";
    if (isSw) {
      reply = `Tumerekodi *${detectedVolume.toLocaleString()} KG*. Mzigo wako unapatikana katika ghala gani la mkusanyiko?\n\n📍 *Bunia*, *Goma*, *Kitale*, *Eldoret*, *Nakuru*, au *Bukavu*?`;
    } else if (isFr) {
      reply = `Noté pour *${detectedVolume.toLocaleString()} KG*. Dans quel dépôt régional se trouve votre cargaison ?\n\n📍 *Bunia*, *Goma*, *Kitale*, *Eldoret*, *Nakuru*, ou *Bukavu* ?`;
    } else {
      reply = `Recorded *${detectedVolume.toLocaleString()} KG*. Which regional collection depot is your cargo located at?\n\n📍 *Bunia*, *Goma*, *Kitale*, *Eldoret*, *Nakuru*, or *Bukavu*?`;
    }
    return { reply, newState };
  }

  return { reply: "Tafadhali thibitisha mzigo wako.", newState };
}

export default function WhatsAppSimulatorModal({ isOpen, onClose, backendUrl, lang = 'en' }) {
  const [phoneNumber] = useState('+254712345678');
  const [selectedLang, setSelectedLang] = useState(lang);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);

  const [convState, setConvState] = useState({
    step: 'GREETING',
    crop: null,
    volume: null,
    depot: null
  });

  const [messages, setMessages] = useState(() => [
    {
      sender: 'bot',
      text:
        lang === 'sw'
          ? "🌾 *Karibu KilimoAgent WhatsApp Gateway*\n\nTuma salamu au maelezo ya mavuno yako kupata soko lenye faida ya juu na usafiri wa moja kwa moja.\n\n_Mfano: 'Habari' au 'Nina mahindi 1500kg Bunia'_"
          : lang === 'fr'
          ? "🌾 *Bienvenue sur KilimoAgent WhatsApp Gateway*\n\nEnvoyez un message ou décrivez votre récolte pour obtenir le meilleur prix du marché et un transporteur dédié.\n\n_Exemple: 'Bonjour' ou 'J'ai 1500 kg de maïs à Bunia'_"
          : "🌾 *Welcome to KilimoAgent WhatsApp Gateway*\n\nSend a greeting or declare your harvest to lock maximum arbitrage profit and instant carrier waybill.\n\n_Example: 'Hello' or 'I have 1500kg maize at Bunia depot'_",
      time: "10:00"
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen, scrollToBottom]);

  if (!isOpen) return null;

  const langOptions = [
    { code: 'sw', label: 'Swahili (Kiswahili)', Flag: TanzaniaFlag },
    { code: 'fr', label: 'Français', Flag: FranceFlag },
    { code: 'en', label: 'English', Flag: UkFlag }
  ];

  const currentLangObj = langOptions.find(l => l.code === selectedLang) || langOptions[2];
  const CurrentFlag = currentLangObj.Flag;

  const handleSend = async (e, directText = null) => {
    if (e) e.preventDefault();
    const textToSend = (directText !== null ? directText : messageText).trim();
    if (!textToSend) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      sender: 'user',
      text: textToSend,
      time: userTime
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setMessageText('');

    // Dynamic language detection from first word or text
    let activeLang = selectedLang;
    const lower = textToSend.toLowerCase();
    if (/^(salut|bonjour|bonsoir|coucou|je\s|j'ai|vendre)\b/i.test(lower) || /\b(manioc|haricot|maïs|sacs?|récolte|prix)\b/i.test(lower)) {
      activeLang = 'fr';
      setSelectedLang('fr');
    } else if (/^(habari|jambo|hujambo|sijambo|mambo|niaje|sasa|karibu)\b/i.test(lower) || /\b(mahindi|muhogo|maharagwe|nyanya|magunia|kilo)\b/i.test(lower)) {
      activeLang = 'sw';
      setSelectedLang('sw');
    } else if (/^(hello|hi|hey|good\s+morning|good\s+afternoon)\b/i.test(lower)) {
      activeLang = 'en';
      setSelectedLang('en');
    }

    try {
      if (backendUrl && backendUrl.startsWith("http")) {
        const formData = new FormData();
        formData.append('phone_number', phoneNumber);
        formData.append('message_text', textToSend);
        formData.append('language', activeLang);

        const res = await fetch(`${backendUrl}/api/v1/whatsapp/simulate`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.detected_language && ['fr', 'sw', 'en'].includes(data.detected_language)) {
            setSelectedLang(data.detected_language);
          }
          if (data.action === "TERMINATE_SESSION" || data.is_terminated) {
            setConvState(prev => ({ ...prev, isTerminated: true }));
          }
          if (data.extracted_params) {
            setConvState(prev => ({
              ...prev,
              crop: data.extracted_params.crop || prev.crop,
              volume: data.extracted_params.volume_kg || prev.volume,
              depot: data.extracted_params.origin_depot || prev.depot
            }));
          }
          const botReply = data.whatsapp_message || data.whatsapp_response || data.response;
          if (botReply) {
            setMessages(prev => [
              ...prev,
              {
                sender: 'bot',
                text: botReply,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            setLoading(false);
            return;
          }
        }
      }
      throw new Error("Local multi-turn fallback invoked");
    } catch (err) {
      console.warn("WhatsApp API Notice, executing client multi-turn handler:", err);
      setTimeout(() => {
        const { reply, newState } = computeMultiTurnResponse(textToSend, convState, activeLang);
        setConvState(newState);
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setLoading(false);
      }, 400);
    }
  };

  const renderQuickChips = () => {
    const isSw = selectedLang === 'sw';
    const isFr = selectedLang === 'fr';

    if (convState.step === 'GREETING' || convState.step === 'AWAITING_CROP') {
      return [
        { label: "🌽 Maize / Mahindi", val: isSw ? "Nina Mahindi" : isFr ? "J'ai du Maïs" : "I have Maize" },
        { label: "🥔 Cassava / Manioc", val: isSw ? "Nina Mihogo" : isFr ? "J'ai du Manioc" : "I have Cassava" },
        { label: "☕ Coffee / Kahawa", val: isSw ? "Kahawa Arabica" : isFr ? "Café Arabica" : "Arabica Coffee" },
        { label: "🫘 Dry Beans", val: isSw ? "Maharagwe" : isFr ? "Haricots" : "Dry Beans" }
      ];
    }

    if (convState.step === 'AWAITING_VOLUME') {
      return [
        { label: "500 KG (10 bags)", val: "500kg" },
        { label: "1,500 KG (30 bags)", val: "1500kg" },
        { label: "2,700 KG (54 bags)", val: "2700kg" },
        { label: "5,000 KG (100 bags)", val: "5000kg" }
      ];
    }

    if (convState.step === 'AWAITING_DEPOT') {
      return [
        { label: "📍 Bunia Depot", val: "Bunia Depot" },
        { label: "📍 Goma Center", val: "Goma Logistics Center" },
        { label: "📍 Kitale Depot", val: "Kitale Depot" },
        { label: "📍 Eldoret Hub", val: "Eldoret Depot" }
      ];
    }

    return [
      { label: "🔄 Start New Request", val: isSw ? "Habari" : isFr ? "Bonjour" : "Hello" },
      { label: "🌽 Maize 2,700kg Bunia", val: isSw ? "Nina mahindi 2700kg Bunia" : isFr ? "J'ai 2700kg de maïs à Bunia" : "I have 2700kg maize at Bunia" }
    ];
  };

  const handleResetChat = async () => {
    setConvState({ step: 'GREETING', crop: null, volume: null, depot: null });
    try {
      if (backendUrl && backendUrl.startsWith("http")) {
        await fetch(`${backendUrl}/api/v1/whatsapp/session/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_number: phoneNumber })
        });
      }
    } catch (e) {
      console.warn("Could not reset backend session:", e);
    }

    setMessages([
      {
        sender: 'bot',
        text:
          selectedLang === 'sw'
            ? "🌾 *Karibu tena KilimoAgent WhatsApp Gateway*\n\nTuma salamu au maelezo ya mavuno yako kuanza upya.\n\n_Mfano: 'Habari' au 'Nina mahindi 1500kg Bunia'_"
            : selectedLang === 'fr'
            ? "🌾 *Bienvenue à nouveau sur KilimoAgent WhatsApp Gateway*\n\nEnvoyez un message pour commencer une nouvelle expédition.\n\n_Exemple: 'Bonjour' ou 'J'ai 1500 kg de maïs à Bunia'_"
            : "🌾 *Welcome back to KilimoAgent WhatsApp Gateway*\n\nSend a message to start a fresh dispatch.\n\n_Example: 'Hello' or 'I have 1500kg maize at Bunia depot'_",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-3xl  overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <img src="/icons/whatsapp.svg" alt="WhatsApp" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5 min-w-0">
                <span className="truncate">WhatsApp Field Gateway Simulator</span>
                <GeminiIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </h3>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                Multi-Turn Conversational Agricultural Agent
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleResetChat}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Language & Sender Bar */}
        <div className="px-4 sm:px-6 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-bold">Language:</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none transition cursor-pointer"
              >
                <CurrentFlag className="w-4 h-3 shrink-0 rounded-xs" />
                <span>{currentLangObj.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>

              {showLangMenu && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-2xl  p-1.5 space-y-1 z-50 animate-in fade-in duration-150">
                  {langOptions.map((l) => {
                    const FlagIcon = l.Flag;
                    const isSelected = selectedLang === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setSelectedLang(l.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <FlagIcon className="w-4 h-3 shrink-0 rounded-xs" />
                          <span>{l.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Phone: <span className="text-emerald-400 font-bold">{phoneNumber}</span>
          </div>
        </div>

        {/* Messages Stream Container */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0B0F17] min-h-[320px] max-h-[460px]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none font-medium whitespace-pre-wrap'
                    : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700 font-normal'
                }`}
              >
                {msg.sender === 'bot' ? formatWhatsAppMarkdown(msg.text) : msg.text}
              </div>
              <div className="flex items-center space-x-1 mt-1 text-[10px] text-slate-500">
                <span>{msg.time}</span>
                {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-emerald-400" />}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-slate-300 p-2.5 bg-slate-900 rounded-xl w-fit border border-slate-800">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>KilimoAgent is calculating optimal arbitrage & waybill...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Tappable Reply Chips */}
        <div className="px-3 py-2 bg-[#090D16] border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <span className="text-[9px] uppercase font-bold text-slate-500 shrink-0">Quick Reply:</span>
          {renderQuickChips().map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (chip.label.includes("Start New Request") || chip.label.includes("Anza upya")) {
                  handleResetChat();
                } else {
                  handleSend(null, chip.val);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Chat Input Form or Terminated Security Lock */}
        {convState.isTerminated ? (
          <div className="p-3 bg-rose-950/40 border-t border-rose-500/40 flex items-center justify-between gap-3 animate-in fade-in">
            <span className="text-xs text-rose-300 font-bold flex items-center gap-1.5 truncate">
              🛑 Session verrouillée par mesure de sécurité
            </span>
            <button
              type="button"
              onClick={handleResetChat}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              🔄 Recommencer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={
                selectedLang === 'sw'
                  ? "Andika 'Habari', aina ya zao, au uzito hapa..."
                  : selectedLang === 'fr'
                  ? "Tapez 'Bonjour', la récolte ou le volume..."
                  : "Type 'Hello', crop name, or volume here..."
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={loading || !messageText.trim()}
              className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition disabled:opacity-40 cursor-pointer font-bold"
            >
              <Send className="w-4 h-4 text-slate-950 fill-current" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
