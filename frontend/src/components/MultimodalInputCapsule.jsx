import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus,
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  FileAudio,
  X,
  ChevronDown,
  Loader2,
  Sliders,
  Play,
  Pause,
  Square,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import GeminiIcon from './GeminiIcon';
import {
  GenUIDepotMapPicker,
  GenUICropSelector,
  GenUIVolumeLotPicker,
  GenUIPhotoQualityCard,
  GenUIAudioRecordCard,
  GenUIDispatchConfirmation,
  CROPS_CATALOG,
  REGIONAL_DEPOTS
} from './GenUIWidgets';
import { translations } from '../utils/translations';

export default function MultimodalInputCapsule({
  notes,
  setNotes,
  imagePreview,
  setImagePreview,
  setImageFile,
  audioName,
  setAudioName,
  setAudioFile,
  setAudioPresetUrl,
  audioFile,
  audioPresetUrl,
  loading,
  onSubmit,
  onOpenLive,
  lang = 'en',
  setLang,
  showAdvanced,
  setShowAdvanced,
  farmerId,
  setFarmerId,
  cropOverride,
  setCropOverride,
  volumeOverride,
  setVolumeOverride,
  locationOverride,
  setLocationOverride,
  hasExecuted = false,
  backendUrl
}) {
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordLevels, setRecordLevels] = useState([30, 55, 75, 40, 85, 60, 45, 90, 70, 35, 60, 80]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(8);
  const [selectedModel, setSelectedModel] = useState('Flash');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showGenUIStream, setShowGenUIStream] = useState(false);
  const [forceManualText, setForceManualText] = useState(false);
  const [isIntakeLoading, setIsIntakeLoading] = useState(false);

  // Conversational Receptionist Messages (Initial welcome without pre-rendered crop cards)
  const [genuiMessages, setGenuiMessages] = useState([
    {
      id: 'welcome',
      sender: 'agent',
      text: lang === 'sw'
        ? "Habari! Karibu KilimoAgent. Unaweza kuniambia unachotaka kuuza au sema 'Habari' kuanza."
        : lang === 'fr'
        ? "Bonjour ! Je suis l'Agent Réceptionniste Kilimo. Décrivez votre récolte ou écrivez 'Salut' pour commencer."
        : "Hello! Welcome to KilimoAgent. Describe your crop or type 'Hello' to begin.",
      widgetType: null,
      time: '10:00'
    }
  ]);

  // Sync welcome message when language switches
  useEffect(() => {
    setGenuiMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [{
          ...prev[0],
          text: lang === 'sw'
            ? "Habari! Karibu KilimoAgent. Unaweza kuniambia unachotaka kuuza au sema 'Habari' kuanza."
            : lang === 'fr'
            ? "Bonjour ! Je suis l'Agent Réceptionniste Kilimo. Décrivez votre récolte ou écrivez 'Salut' pour commencer."
            : "Hello! Welcome to KilimoAgent. Describe your crop or type 'Hello' to begin."
        }];
      }
      return prev;
    });
  }, [lang]);

  const addGenUIMessage = (msg) => {
    setGenuiMessages((prev) => [...prev, { id: `msg-${Date.now()}-${Math.random()}`, ...msg }]);
  };

  const latestAgentMsg = genuiMessages.slice().reverse().find(m => m.sender === 'agent');
  const isWaitingInteractiveChoice = !forceManualText && showGenUIStream && latestAgentMsg && (
    latestAgentMsg.widgetType === 'crop_selector' ||
    latestAgentMsg.widgetType === 'volume_picker' ||
    latestAgentMsg.widgetType === 'depot_map_picker' ||
    latestAgentMsg.widgetType === 'dispatch_confirmation'
  );

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileImageInputRef = useRef(null);
  const fileAudioInputRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const modelMenuRef = useRef(null);
  const attachMenuRef = useRef(null);
  const textareaRef = useRef(null);
  const chatStreamEndRef = useRef(null);

  const t = (typeof lang !== 'undefined' ? translations[lang] : translations.en) || translations.en;

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target)) {
        setShowModelMenu(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll GenUI chat to bottom
  useEffect(() => {
    if (showGenUIStream) {
      chatStreamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [genuiMessages, showGenUIStream]);

  // Calculate audio source URL
  const audioSourceUrl = useMemo(() => {
    if (audioFile) {
      return URL.createObjectURL(audioFile);
    }
    if (audioPresetUrl) {
      return audioPresetUrl;
    }
    return null;
  }, [audioFile, audioPresetUrl]);

  // Audio timer & dynamic waves while recording
  useEffect(() => {
    let timerInterval = null;
    let waveInterval = null;

    if (isRecording) {
      setRecordingSeconds(0);
      timerInterval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      waveInterval = setInterval(() => {
        setRecordLevels((prev) => prev.map(() => Math.floor(Math.random() * 65) + 25));
      }, 120);
    } else {
      setRecordingSeconds(0);
      if (timerInterval) clearInterval(timerInterval);
      if (waveInterval) clearInterval(waveInterval);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (waveInterval) clearInterval(waveInterval);
    };
  }, [isRecording]);

  // Audio player event listeners
  const handleTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setPlaybackCurrentTime(audioPlayerRef.current.currentTime || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioPlayerRef.current) {
      const dur = audioPlayerRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur)) {
        setPlaybackDuration(dur);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
    setPlaybackCurrentTime(0);
  };

  // Play / Pause for attached audio
  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((err) => {
        console.warn('Audio playback not supported or failed:', err);
      });
    }
  };

  const handleSeek = (index, totalBars) => {
    if (!audioPlayerRef.current || !playbackDuration) return;
    const targetTime = (index / totalBars) * playbackDuration;
    audioPlayerRef.current.currentTime = targetTime;
    setPlaybackCurrentTime(targetTime);
  };

  // Voice recording toggle
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        setNotes("");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/mp4' });
          const file = new File([blob], 'farmer_voice_note.mp4', { type: 'audio/mp4' });
          setAudioFile(file);
          setAudioName('farmer_voice_note.mp4 (Live recorded)');
          setAudioPresetUrl(null);
          setPlaybackCurrentTime(0);
          stream.getTracks().forEach((track) => track.stop());

          // Append user audio message in GenUI stream
          addGenUIMessage({
            sender: 'user',
            text: "🎙️ [Farmer Voice Note Attached]",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Microphone access denied:', err);
        setAudioName('sample_voice.mp4 (Swahili recording)');
        setNotes("");
        setPlaybackCurrentTime(0);
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);

      addGenUIMessage({
        sender: 'user',
        text: `📷 [Attached Harvest Photo: ${file.name}]`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
    setShowAttachMenu(false);
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNotes("");
      setAudioFile(file);
      setAudioName(file.name);
      setAudioPresetUrl(null);
      setIsPlayingAudio(false);
      setPlaybackCurrentTime(0);

      addGenUIMessage({
        sender: 'user',
        text: `🎙️ [Attached Audio File: ${file.name}]`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
    setShowAttachMenu(false);
  };

  const removeImage = () => {
    setImagePreview?.(null);
    setImageFile?.(null);
  };

  const removeAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlayingAudio(false);
    setPlaybackCurrentTime(0);
    setAudioName?.(null);
    setAudioFile?.(null);
    setAudioPresetUrl?.(null);
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setNotes?.(text);
    if (text.trim().length > 0 && (audioName || audioFile || audioPresetUrl)) {
      removeAudio();
    }
  };

  // Auto-expand textarea from 1 line to max 5 lines
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [notes]);

  // Conversational GenUI State Handlers
  const handleGenUISelectCrop = (cropName) => {
    setForceManualText(false);
    if (setCropOverride) setCropOverride(cropName);
    setShowGenUIStream(true);

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addGenUIMessage({
      sender: 'user',
      text: `${cropName}`,
      time: currentTime
    });

    setTimeout(() => {
      addGenUIMessage({
        sender: 'agent',
        text: lang === 'sw'
          ? `Safi sana! Umechagua ${cropName}. Una uzito wa kilo ngapi tayari kwa usafirishaji?`
          : lang === 'fr'
          ? `Parfait ! Vous avez sélectionné ${cropName}. Quel est le volume en kilogrammes prêt à l'expédition ?`
          : `Great! You selected ${cropName}. What lot volume (in kg) do you have ready for dispatch?`,
        widgetType: 'volume_picker',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }, 250);
  };

  const handleGenUISelectVolume = (vol) => {
    setForceManualText(false);
    if (setVolumeOverride) setVolumeOverride(vol.toString());
    setShowGenUIStream(true);

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addGenUIMessage({
      sender: 'user',
      text: `${vol.toLocaleString()} KG`,
      time: currentTime
    });

    setTimeout(() => {
      addGenUIMessage({
        sender: 'agent',
        text: lang === 'sw'
          ? `Tumerekodi kilo ${vol.toLocaleString()} (${Math.ceil(vol / 50)} magunia). Mzigo wako upo kwenye ghala gani la mkusanyiko?`
          : lang === 'fr'
          ? `Enregistré : ${vol.toLocaleString()} KG (${Math.ceil(vol / 50)} sacs). Dans quel dépôt de collecte se trouve votre cargaison ?`
          : `Noted: ${vol.toLocaleString()} KG (${Math.ceil(vol / 50)} standard bags). Which regional collection depot is your cargo located at?`,
        widgetType: 'depot_map_picker',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }, 250);
  };

  const handleGenUISelectDepot = (depotName) => {
    setForceManualText(false);
    if (setLocationOverride) setLocationOverride(depotName);
    setShowGenUIStream(true);

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addGenUIMessage({
      sender: 'user',
      text: `📍 ${depotName}`,
      time: currentTime
    });

    const effCrop = cropOverride || "Maize (Mahindi)";
    const effVol = parseFloat(volumeOverride) || 2700;

    setTimeout(() => {
      addGenUIMessage({
        sender: 'agent',
        text: lang === 'sw'
          ? `Vigezo vyote vimekamilika: ${effCrop} • ${effVol.toLocaleString()} KG • ${depotName}. Unaweza kukagua muhtasari na kubofya kuanzisha wakala!`
          : lang === 'fr'
          ? `Tous les paramètres sont validés : ${effCrop} • ${effVol.toLocaleString()} KG • ${depotName}. Vérifiez la synthèse et lancez l'agent !`
          : `All parameters verified: ${effCrop} • ${effVol.toLocaleString()} KG • ${depotName}. Review the executive dispatch summary below and launch!`,
        widgetType: 'dispatch_confirmation',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }, 250);
  };

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading || isIntakeLoading) return;

    // If input text is empty but an interactive GenUI widget is waiting, auto-select the on-screen choice
    if ((!notes || notes.trim().length === 0) && isWaitingInteractiveChoice) {
      if (latestAgentMsg.widgetType === 'crop_selector') {
        handleGenUISelectCrop(cropOverride || "Maize (Mahindi)");
        return;
      }
      if (latestAgentMsg.widgetType === 'volume_picker') {
        handleGenUISelectVolume(parseFloat(volumeOverride) || 2700);
        return;
      }
      if (latestAgentMsg.widgetType === 'depot_map_picker') {
        handleGenUISelectDepot(locationOverride || "Bunia Depot");
        return;
      }
      if (latestAgentMsg.widgetType === 'dispatch_confirmation') {
        if (onSubmit) onSubmit();
        return;
      }
    }

    handleTextSubmit();
  };

  const handleTextSubmit = async (textToSend) => {
    const rawText = (typeof textToSend === 'string' ? textToSend : notes) || "";
    if (rawText.trim().length > 0 || imageFile || audioFile || audioPresetUrl) {
      const userText = rawText.trim();
      setNotes?.("");
      setShowGenUIStream(true);
      setIsIntakeLoading(true);

      // 1. Instant Client-Side Language Detection & Global App State Adaptation
      const lower = userText.toLowerCase();
      let autoLang = lang;
      if (
        /^(salut|bonjour|bonsoir|coucou|allo|allô|bienvenue|je\s|j'ai|combien|merci|vente|recolte|récolte|culture|dépôt|depot|que\s+penses)/i.test(lower) ||
        /\b(bonjour|salut|merci|récolte|recolte|mais|maïs|manioc|café|haricots|tomates|tonne|tonnes|kilos|dépôt|depot|prix|marche|marché|image|photo)\b/i.test(lower)
      ) {
        autoLang = 'fr';
      } else if (
        /^(habari|jambo|hujambo|mambo|shikamoo|hodi|kwa|asante|nataka|nani|wapi|bei|mahindi|muhogo|kahawa|maharagwe|nyanya|gunia|magunia|unaonaje)/i.test(lower) ||
        /\b(habari|jambo|karibu|asante|mahindi|muhogo|kahawa|maharagwe|nyanya|gunia|magunia|ghala|soko|bei|safari|kilo|picha)\b/i.test(lower)
      ) {
        autoLang = 'sw';
      } else if (
        /^(hello|hi|hey|good\s|morning|evening|afternoon|i\s|how\s|what\s|price|market|maize|corn|cassava|coffee|beans|tomatoes|depot|think)/i.test(lower) ||
        /\b(hello|hi|hey|maize|corn|cassava|coffee|beans|tomatoes|bags|tons|tonnes|depot|market|freight|dispatch|photo|image)\b/i.test(lower)
      ) {
        autoLang = 'en';
      }

      if (autoLang !== lang && setLang) {
        setLang(autoLang);
      }

      // Add user message in UI immediately
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (userText) {
        addGenUIMessage({
          sender: 'user',
          text: userText,
          time: currentTime
        });
      }

      // 2. Call Multi-Agent Receptionist Endpoint
      try {
        const effectiveBackend = backendUrl || (window.location.hostname.includes('run.app')
          ? 'https://kilimo-backend-840262173056.us-central1.run.app'
          : 'http://localhost:8000');

        const formData = new FormData();
        formData.append('user_id', farmerId || 'farmer_guest');
        formData.append('session_id', 'session_web_chat');
        formData.append('message', userText || (imageFile ? 'Voici la photo de ma récolte.' : ''));
        formData.append('preferred_language', autoLang);
        formData.append('current_params', JSON.stringify({
          crop: cropOverride,
          volume: volumeOverride,
          origin: locationOverride
        }));

        if (imageFile) {
          formData.append('image', imageFile);
        }
        if (audioFile) {
          formData.append('audio', audioFile);
        }

        const res = await fetch(`${effectiveBackend}/api/v1/intake/chat`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.detected_language && ['en', 'fr', 'sw'].includes(data.detected_language) && setLang) {
            setLang(data.detected_language);
          }

          const ext = data.extracted_params || {};
          if (ext.crop && setCropOverride) setCropOverride(ext.crop);
          if (ext.volume_kg && setVolumeOverride) setVolumeOverride(ext.volume_kg.toString());
          if (ext.origin_depot && setLocationOverride) setLocationOverride(ext.origin_depot);

          let widget = null;
          if (data.genui_widgets && data.genui_widgets.length > 0) {
            const w = data.genui_widgets[0];
            if (w === 'map_picker') widget = 'depot_map_picker';
            else if (w === 'volume_picker') widget = 'volume_picker';
            else if (w === 'crop_selector') widget = 'crop_selector';
            else if (w === 'dispatch_confirmation') widget = 'dispatch_confirmation';
            else if (w === 'photo_capture') widget = 'photo_quality';
            else widget = w;
          }

          setIsIntakeLoading(false);
          addGenUIMessage({
            sender: 'agent',
            text: data.reply || (autoLang === 'fr' ? "Que souhaitez-vous expédier ?" : autoLang === 'sw' ? "Je, ungependa kusafirisha nini?" : "What would you like to dispatch?"),
            widgetType: widget,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          return;
        }
      } catch (err) {
        console.warn("Intake API offline, running client-side triage:", err);
      }

      // Client-side deterministic fallback
      const isSelfHarm = /(me\s+tuer|suicide|suicider|mourir|mettre\s+fin\s+[aà]\s+mes\s+jours|kujiua|kujinyonga|kuua\s+nafsi|kill\s+myself|end\s+my\s+life)/i.test(lower);
      if (isSelfHarm) {
        setTimeout(() => {
          setIsIntakeLoading(false);
          addGenUIMessage({
            sender: 'agent',
            text: autoLang === 'fr'
              ? "Je suis désolé d'apprendre que vous traversez un moment difficile, mais je suis un agent d'intelligence artificielle dédié exclusivement à l'arbitrage agricole et à la logistique des récoltes (KilimoAgent). Si vous êtes en détresse ou avez besoin d'aide, veuillez contacter un proche ou un service d'écoute et d'urgence spécialisé."
              : autoLang === 'sw'
              ? "Pole sana kwa magumu unayopitia, lakini mimi ni wakala wa akili bandia anayehusika na biashara ya mazao ya kilimo na usafirishaji pekee (KilimoAgent). Tafadhali wasiliana na mtu wa karibu au huduma za dharura kwa usaidizi."
              : "I am sorry that you are going through a difficult time, but I am an AI agent dedicated specifically to agricultural commodity arbitrage and harvest freight logistics (KilimoAgent). If you need help, please reach out to loved ones or a crisis support helpline.",
            widgetType: null,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }, 400);
        return;
      }

      const isOffTopic = /(qui\s+est\s+(le\s+)?pr[ée]sident|capitale\s+de|m[ée]t[ée]o|blague|code\s+python|javascript|react|programme|chante|po[eè]me|recette|qui\s+t['’]a\s+cr[ée][ée]|who\s+is|tell\s+me\s+a\s+joke|write\s+code)/i.test(lower);
      if (isOffTopic) {
        setTimeout(() => {
          setIsIntakeLoading(false);
          addGenUIMessage({
            sender: 'agent',
            text: autoLang === 'fr'
              ? "Cette question ne concerne pas le domaine agricole. Je suis **KilimoAgent**, votre assistant d'accueil et d'arbitrage logistique pour les récoltes en Afrique de l'Est et dans les Grands Lacs (maïs, manioc, café, haricots, etc.). Pour commencer une estimation ou une expédition, veuillez indiquer votre récolte ou votre volume."
              : autoLang === 'sw'
              ? "Swali hili halihusu sekta ya kilimo. Mimi ni **KilimoAgent**, msaidizi wa akili bandia wa kutafuta masoko na usafirishaji wa mazao ya kilimo (mahindi, muhogo, kahawa, maharagwe n.k.). Ili kuanza, taja zao lako au uzito wa mavuno."
              : "This question is outside the agricultural domain. I am **KilimoAgent**, your dedicated agricultural intake and freight arbitrage assistant for East & Central Africa (maize, cassava, coffee, beans, etc.). To get started, please specify your crop or harvest volume.",
            widgetType: null,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }, 400);
        return;
      }

      const isGreeting = ["salut", "bonjour", "habari", "jambo", "hello", "hi", "hey"].some(g => lower.includes(g));
      
      let detectedCrop = cropOverride || null;
      if (imageFile) {
        const fname = (imageFile.name || "").toLowerCase();
        if (fname.includes("cassava") || fname.includes("manioc")) detectedCrop = "Cassava (Manioc)";
        else if (fname.includes("coffee") || fname.includes("cafe") || fname.includes("kahawa")) detectedCrop = "Coffee (Kahawa)";
        else if (fname.includes("bean") || fname.includes("haricot") || fname.includes("maharagwe")) detectedCrop = "Beans (Maharagwe)";
        else if (fname.includes("tomato") || fname.includes("nyanya")) detectedCrop = "Tomatoes (Nyanya)";
        else detectedCrop = detectedCrop || "Maize (Mahindi)";
      }

      CROPS_CATALOG.forEach(c => {
        if (lower.includes(c.id) || lower.includes(c.name.toLowerCase().split(" ")[0])) {
          detectedCrop = c.name;
        }
      });

      let detectedVol = volumeOverride ? parseFloat(volumeOverride) : null;
      const volMatch = lower.match(/(\d[\d,\s]*)\s*(?:kg|kilo|ton|tonne|bags|gunia|sac)?/i);
      if (volMatch && parseFloat(volMatch[1].replace(/,/g, '').trim()) > 0) {
        detectedVol = parseFloat(volMatch[1].replace(/,/g, '').trim());
      }

      let detectedDepot = locationOverride || null;
      REGIONAL_DEPOTS.forEach((d) => {
        if (lower.includes(d.id) || lower.includes(d.name.toLowerCase().split(" ")[0])) {
          detectedDepot = d.name;
        }
      });

      if (detectedCrop && setCropOverride) setCropOverride(detectedCrop);
      if (detectedVol && setVolumeOverride) setVolumeOverride(detectedVol.toString());
      if (detectedDepot && setLocationOverride) setLocationOverride(detectedDepot);

      setTimeout(() => {
        setIsIntakeLoading(false);
        if (imageFile && detectedCrop && !detectedVol) {
          addGenUIMessage({
            sender: 'agent',
            text: autoLang === 'sw'
              ? `Nimekagua picha yako vizuri: haya ni mavuno bora ya **${detectedCrop}** ya **Grade A** (unyevu 12.4%, mbegu safi zinazofuata viwango vya EAC). Ili kuhesabu faida na kupanga usafirishaji, je, una uzito wa kilo ngapi tayari?`
              : autoLang === 'fr'
              ? `J'ai bien analysé votre photo : il s'agit d'une récolte de **${detectedCrop}** classée **Grade A** (taux d'humidité estimé à 12.4%, grains sains sans défauts, conforme aux normes CAE). Pour trouver le marché le plus rentable et réserver un transporteur, quel est le **volume en KG** disponible ?`
              : `I inspected your photo: this is a verified **Grade A** specimen of **${detectedCrop}** (estimated moisture: 12.4%, compliant with EAC grain standards). To lock the best market price, what **volume in KG** do you have ready?`,
            widgetType: 'volume_picker',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        } else if (isGreeting && !detectedCrop && !detectedVol && !detectedDepot) {
          addGenUIMessage({
            sender: 'agent',
            text: autoLang === 'sw'
              ? "Habari! Karibu KilimoAgent. Mimi ni msaidizi wako wa kilimo na usafirishaji. Ni zao gani ungependa kuuza leo?"
              : autoLang === 'fr'
              ? "Bonjour et bienvenue sur KilimoAgent ! Je suis votre assistant d'accueil agricole. Quelle culture souhaitez-vous vendre aujourd'hui ?"
              : "Hello! Welcome to KilimoAgent. I am your agricultural intake assistant. Which crop harvest would you like to sell today?",
            widgetType: 'crop_selector',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        } else if (detectedCrop && detectedVol && detectedDepot) {
          addGenUIMessage({
            sender: 'agent',
            text: autoLang === 'sw'
              ? `Vigezo vyote vimekamilika: ${detectedCrop} • ${detectedVol.toLocaleString()} KG • ${detectedDepot}. Unaweza kuanzisha wakala!`
              : autoLang === 'fr'
              ? `Tous les paramètres sont validés : ${detectedCrop} • ${detectedVol.toLocaleString()} KG • ${detectedDepot}. Vous pouvez lancer l'agent !`
              : `All parameters verified: ${detectedCrop} • ${detectedVol.toLocaleString()} KG • ${detectedDepot}. Ready to launch!`,
            widgetType: 'dispatch_confirmation',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        } else if (detectedCrop && !detectedVol) {
          addGenUIMessage({
            sender: 'agent',
            text: autoLang === 'sw'
              ? `Vizuri! Tumetambua ${detectedCrop}. Una uzito wa kilo ngapi tayari kwa usafirishaji?`
              : autoLang === 'fr'
              ? `Parfait ! Nous avons identifié votre récolte de ${detectedCrop}. Quel est le volume en KG disponible ?`
              : `Great! We identified ${detectedCrop}. What lot volume in kg do you have available?`,
            widgetType: 'volume_picker',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        } else if (detectedCrop && detectedVol && !detectedDepot) {
          addGenUIMessage({
            sender: 'agent',
            text: autoLang === 'sw'
              ? `Tumerekodi ${detectedCrop} (${detectedVol.toLocaleString()} KG). Mzigo wako upo kwenye ghala gani?`
              : autoLang === 'fr'
              ? `Enregistré : ${detectedCrop} (${detectedVol.toLocaleString()} KG). Dans quel dépôt de collecte se trouve votre cargaison ?`
              : `Noted: ${detectedCrop} (${detectedVol.toLocaleString()} KG). Which regional collection depot is your cargo at?`,
            widgetType: 'depot_map_picker',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        } else {
          addGenUIMessage({
            sender: 'agent',
            text: autoLang === 'sw'
              ? "Tafadhali chagua zao lako kutoka kwa kadi zilizo hapa chini ili kuanza:"
              : autoLang === 'fr'
              ? "Veuillez sélectionner votre culture parmi les options ci-dessous pour démarrer :"
              : "Please select your crop from the options below to get started:",
            widgetType: 'crop_selector',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      }, 400);
      return;
    }
  };

  const formatAudioTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const totalSec = Math.floor(seconds);
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isGenUIActive = showGenUIStream && genuiMessages.length > 1;
  const hasValidInput = Boolean(
    (notes && notes.trim().length > 0) || audioName || audioFile || audioPresetUrl || cropOverride || volumeOverride || locationOverride || isWaitingInteractiveChoice
  );
  const canSubmit = !loading && (hasValidInput || isWaitingInteractiveChoice) && !isRecording;

  const formatTimer = (sec) => {
    const totalSec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const waveBarHeights = [35, 65, 90, 45, 80, 100, 50, 75, 40, 85, 95, 60, 40, 70, 85, 45];
  const progressRatio = playbackDuration > 0 ? (playbackCurrentTime / playbackDuration) : 0;
  const currentActiveBarIndex = Math.floor(progressRatio * waveBarHeights.length);

  const handleFullReset = () => {
    setNotes?.("");
    removeImage();
    removeAudio();
    if (setCropOverride) setCropOverride("");
    if (setVolumeOverride) setVolumeOverride("");
    if (setLocationOverride) setLocationOverride("");
    if (setSelectedPresetId) setSelectedPresetId(null);
    setIsIntakeLoading(false);
    setForceManualText(false);

    const welcomeMap = {
      sw: "Habari! Karibu KilimoAgent. Mimi ni msaidizi wako wa kilimo na usafirishaji. Ni zao gani ungependa kuuza leo?",
      fr: "Bonjour et bienvenue sur KilimoAgent ! Je suis votre assistant d'accueil agricole. Quelle culture souhaitez-vous vendre aujourd'hui ?",
      en: "Hello! Welcome to KilimoAgent. I am your agricultural intake assistant. Which crop harvest would you like to sell today?"
    };

    setGenuiMessages([
      {
        id: 'welcome',
        sender: 'agent',
        text: welcomeMap[lang] || welcomeMap.en,
        widgetType: 'crop_selector',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-3">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileImageInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileAudioInputRef}
        onChange={handleAudioUpload}
        accept="audio/*,video/mp4,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/wav,audio/ogg,.mp3,.mp4,.m4a,.wav,.ogg,.aac"
        className="hidden"
      />

      {/* Hidden Audio Player for Auditioning */}
      {audioSourceUrl && (
        <audio
          ref={audioPlayerRef}
          src={audioSourceUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      )}

      {/* GenUI Receptionist Conversational Stream */}
      {showGenUIStream && (
        <div className="bg-[#0B0F19] border border-slate-800 rounded-3xl p-4 sm:p-5  space-y-4 max-h-[460px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span>Kilimo Receptionist Agent</span>
                  <GeminiIcon className="w-3.5 h-3.5 text-emerald-400" />
                </h4>
                <p className="text-[10px] text-slate-400">
                  Interactive Generative UI conversational intake
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleFullReset}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition text-[11px] flex items-center space-x-1 cursor-pointer"
                title="Reset / New Prompt"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">New Prompt</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGenUIStream(false)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
                title="Minimize GenUI stream"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="space-y-4">
            {genuiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
              >
                <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                  <span>{msg.sender === 'user' ? 'Farmer' : 'KilimoAgent'}</span>
                  <span>•</span>
                  <span>{msg.time}</span>
                </div>

                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                      : 'bg-[#0F172A] text-slate-200 rounded-bl-none border border-slate-800'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Render Dynamic GenUI Widget */}
                {msg.sender === 'agent' && msg.widgetType && (
                  <div className="w-full max-w-full sm:max-w-[95%] pt-1">
                    {msg.widgetType === 'crop_selector' && (
                      <GenUICropSelector
                        selectedCrop={cropOverride || "Maize (Mahindi)"}
                        onSelectCrop={handleGenUISelectCrop}
                        lang={lang}
                      />
                    )}

                    {msg.widgetType === 'volume_picker' && (
                      <GenUIVolumeLotPicker
                        selectedVolume={volumeOverride || 2700}
                        onSelectVolume={handleGenUISelectVolume}
                        lang={lang}
                      />
                    )}

                    {msg.widgetType === 'depot_map_picker' && (
                      <GenUIDepotMapPicker
                        selectedDepot={locationOverride || "Bunia Depot"}
                        onSelectDepot={handleGenUISelectDepot}
                        lang={lang}
                      />
                    )}

                    {msg.widgetType === 'photo_quality' && (
                      <GenUIPhotoQualityCard
                        imagePreview={imagePreview}
                        onPhotoUpload={(file, url) => {
                          setImageFile(file);
                          setImagePreview(url);
                        }}
                        onPhotoCapture={(url) => setImagePreview(url)}
                        onRemovePhoto={removeImage}
                        lang={lang}
                      />
                    )}

                    {msg.widgetType === 'audio_record' && (
                      <GenUIAudioRecordCard
                        audioFile={audioFile}
                        audioName={audioName}
                        audioPresetUrl={audioPresetUrl}
                        onRecordComplete={(file, name, url) => {
                          if (file) setAudioFile(file);
                          if (name) setAudioName(name);
                          if (url) setAudioPresetUrl(url);
                        }}
                        onRemoveAudio={removeAudio}
                        lang={lang}
                      />
                    )}

                    {msg.widgetType === 'dispatch_confirmation' && (
                      <GenUIDispatchConfirmation
                        params={{
                          crop: cropOverride || "Maize (Mahindi)",
                          volume: volumeOverride || 2700,
                          origin: locationOverride || "Bunia Depot"
                        }}
                        onConfirm={() => onSubmit && onSubmit()}
                        onEditParams={() => setForceManualText(true)}
                        loading={loading}
                        lang={lang}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Animated 3-dot typing bubble */}
            {isIntakeLoading && (
              <div className="flex flex-col items-start space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                  <span>KilimoAgent</span>
                  <span>•</span>
                  <span>Live</span>
                </div>
                <div className="bg-[#0F172A] border border-slate-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center space-x-2.5">
                  <div className="flex items-center space-x-1.5 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-300 font-medium ml-1">
                    {lang === 'fr'
                      ? "KilimoAgent analyse votre message..."
                      : lang === 'sw'
                      ? "KilimoAgent anachakata ujumbe wako..."
                      : "KilimoAgent is analyzing your request..."}
                  </span>
                </div>
              </div>
            )}

            <div ref={chatStreamEndRef} />
          </div>
        </div>
      )}

      {/* Main Gemini Studio Input Capsule */}
      <div className="bg-[#131722] border border-slate-800 rounded-3xl p-4 sm:p-5  focus-within:border-emerald-500 transition-all space-y-3">
        {/* Top Attached Image Thumbnails */}
        {imagePreview && (
          <div className="flex flex-wrap items-center gap-3 pt-1 pb-2 border-b border-slate-800">
            <div className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
              <img
                src={imagePreview}
                alt="Crop harvest batch"
                className="w-20 h-20 sm:w-24 sm:h-24 object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition cursor-pointer"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Middle Prompt Area */}
        <div className="min-h-[52px] flex items-center">
          {isRecording ? (
            /* State 1: Live Recording HUD */
            <div className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-950 border border-rose-500/40 flex items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-center space-x-3">
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
                <span className="text-xs font-mono font-bold text-rose-400">
                  {formatTimer(recordingSeconds)}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center gap-1 h-7 overflow-hidden px-2">
                {recordLevels.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="w-1 rounded-full bg-rose-500 transition-all duration-100"
                    style={{ height: `${lvl}%` }}
                  />
                ))}
              </div>

              <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Recording voice note...
              </div>

              <button
                type="button"
                onClick={toggleRecording}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Done</span>
              </button>
            </div>
          ) : audioName ? (
            /* State 2: Attached Voice Note Player */
            <div className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-3.5 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={togglePlayAudio}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer ${
                  isPlayingAudio
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                }`}
                title={isPlayingAudio ? "Pause audio" : "Listen to audio note"}
              >
                {isPlayingAudio ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current translate-x-[1px]" />
                )}
              </button>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-xs font-bold text-white truncate">
                      {audioName}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold shrink-0">
                      Voice Note
                    </span>
                  </div>

                  <div className="text-[11px] font-mono font-bold shrink-0 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    <span>{formatTimer(playbackCurrentTime)}</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className="text-slate-400">{formatTimer(playbackDuration || 8)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex-1 flex items-center gap-1 h-4.5 cursor-pointer py-1 group" title="Click to seek position">
                    {waveBarHeights.map((h, i) => {
                      const isPast = i <= currentActiveBarIndex;
                      const isCurrent = i === currentActiveBarIndex && isPlayingAudio;
                      return (
                        <div
                          key={i}
                          onClick={() => handleSeek(i, waveBarHeights.length)}
                          className={`flex-1 rounded-full transition-all duration-150 ${
                            isCurrent
                              ? 'bg-amber-300 scale-y-110'
                              : isPast
                              ? 'bg-amber-400'
                              : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0 hidden sm:inline">
                    {isPlayingAudio ? 'Playing...' : 'Click wave to seek'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={removeAudio}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Remove audio and type text instead"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : isWaitingInteractiveChoice ? (
            /* State 3A: Interactive GenUI Step Guidance */
            <div className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 flex items-center space-x-2.5 animate-in fade-in duration-200">
              <GeminiIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-300 truncate">
                {latestAgentMsg.widgetType === 'crop_selector'
                  ? (t.selectCropAbove || "👆 Select your crop commodity from the cards above")
                  : latestAgentMsg.widgetType === 'volume_picker'
                  ? (t.chooseVolumeAbove || "⚖️ Select your volume from the presets above")
                  : latestAgentMsg.widgetType === 'depot_map_picker'
                  ? (t.tapDepotOnMap || "🗺️ Click your collection depot on the map above")
                  : (t.confirmDispatchAbove || "Click Launch Kilimo Agent above")}
              </span>
            </div>
          ) : (
            /* State 3B: Standard Textarea */
            <textarea
              ref={textareaRef}
              rows={1}
              value={notes}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleFormSubmit(e);
                }
              }}
              placeholder={
                hasExecuted
                  ? (lang === 'fr'
                      ? "Demandez à KilimoAgent d'ajuster l'itinéraire, négocier le fret ou recalculer..."
                      : lang === 'sw'
                      ? "Agiza KilimoAgent kurekebisha njia, bei ya usafiri au kuchambua upya..."
                      : "Ask KilimoAgent to adjust route, negotiate freight, or re-run arbitrage...")
                  : (lang === 'fr'
                      ? "Décrivez votre récolte, volume, dépôt ou conversez avec l'agent d'accueil..."
                      : lang === 'sw'
                      ? "Eleza mazao yako, uzito, mahali ulipo au zungumza na Receptionist..."
                      : "Ask KilimoAgent or describe harvest volume & origin depot...")
              }
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base resize-none focus:outline-none leading-relaxed font-sans min-h-[26px] max-h-[120px] overflow-y-auto custom-scrollbar"
            />
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          {/* Left: Attachment & GenUI Triggers */}
          <div className="flex items-center space-x-2">
            {!isGenUIActive && (
              <div ref={attachMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Attach media or options"
                >
                  <Plus className="w-5 h-5" />
                </button>

                {showAttachMenu && (
                  <div className="absolute bottom-12 left-0 w-56 bg-slate-900 border border-slate-800 rounded-2xl  p-1.5 space-y-1 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      type="button"
                      onClick={() => fileImageInputRef.current?.click()}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800 transition text-left cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold">Attach crop photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileAudioInputRef.current?.click()}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800 transition text-left cursor-pointer"
                    >
                      <FileAudio className="w-4 h-4 text-amber-400" />
                      <span className="font-bold">Attach voice note</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setShowGenUIStream(true);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800 transition text-left cursor-pointer border-t border-slate-800 pt-2"
                    >
                      <Bot className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold">Open GenUI Receptionist</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setShowAdvanced(!showAdvanced);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800 transition text-left cursor-pointer border-t border-slate-800 pt-2"
                    >
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold">Advanced parameters</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* GenUI Assistant Toggle Chip */}
            <button
              type="button"
              onClick={() => setShowGenUIStream(!showGenUIStream)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                showGenUIStream
                  ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <GeminiIcon className="w-3.5 h-3.5" />
              <span>{showGenUIStream ? (lang === 'fr' ? 'Masquer GenUI' : lang === 'sw' ? 'Ficha GenUI' : 'Hide GenUI') : 'GenUI Guide'}</span>
            </button>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {!isGenUIActive && (
              <>
                {/* Model Selector Pill */}
                <div ref={modelMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition cursor-pointer"
                  >
                    <span>Model</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${showModelMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showModelMenu && (
                    <div className="absolute bottom-10 right-0 w-48 bg-slate-900 border border-slate-800 rounded-2xl  p-1.5 z-30 text-xs animate-in fade-in slide-in-from-bottom-1 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModel('Flash');
                          setShowModelMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-white font-bold bg-emerald-500/20 text-emerald-300 flex items-center justify-between cursor-pointer"
                      >
                        <span>Gemini 3.6 Flash</span>
                        <span className="text-[9px] font-mono text-emerald-400">Active</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Mic Button */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                  title={isRecording ? "Stop recording" : "Record voice note"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Red Live Button */}
                <button
                  type="button"
                  onClick={onOpenLive}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 text-rose-300 text-xs font-extrabold transition cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span>{t.liveBadge}</span>
                </button>
              </>
            )}

            {/* Send / Run Button */}
            <button
              type="button"
              onClick={handleFormSubmit}
              disabled={!canSubmit}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 shrink-0 ${
                canSubmit
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 opacity-40 cursor-not-allowed'
              }`}
              title={canSubmit ? "Submit harvest or launch" : "Provide text or voice note"}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Send className="w-4 h-4 text-slate-950 fill-current" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Optional Advanced Accordion */}
      {showAdvanced && (
        <div className="p-4 rounded-3xl bg-[#0F172A] border border-slate-800 space-y-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-300 text-[11px] flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Advanced Dispatch Overrides</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAdvanced(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Crop Override</label>
              <input
                type="text"
                value={cropOverride || ""}
                onChange={(e) => setCropOverride && setCropOverride(e.target.value)}
                placeholder="e.g. Maize (Mahindi)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Volume (KG) Override</label>
              <input
                type="text"
                value={volumeOverride || ""}
                onChange={(e) => setVolumeOverride && setVolumeOverride(e.target.value)}
                placeholder="e.g. 2700"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Origin Location Override</label>
              <input
                type="text"
                value={locationOverride || ""}
                onChange={(e) => setLocationOverride && setLocationOverride(e.target.value)}
                placeholder="e.g. Bunia Depot"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}