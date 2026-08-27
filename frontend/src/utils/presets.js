export const PRESET_SCENARIOS = [
  {
    id: "preset-maize-swahili",
    title: "Maize Harvest (Swahili Voice)",
    subtitle: "1,500 kg Maize • Bunia Depot • Grade A",
    category: "Maize / Mahindi",
    crop: "Maize (Zea mays)",
    volumeKg: 1500,
    location: "Bunia Depot",
    farmerId: "FARMER-BUNIA-88",
    notes: "Nafaka zimekauka vizuri bila wadudu, tayari kwa soko.",
    imagePath: "/samples/sample_maize.jpg",
    audioPath: "/samples/sample_voice.mp4",
    audioName: "sample_voice.mp4 (Swahili - Bunia)",
    imageName: "sample_maize.jpg (Yellow Flint)",
    simulationLedger: `### Execution Ledger: Transaction FARMER-BUNIA-88

1. Audio Extraction & Verification
* Spoken Transcribed Excerpt: "Habari KilimoAgent, niko hapa Bunia depot na gunia za mahindi. Kilo 1,500 ziko tayari kwa kusafirishwa."
* Declared Commodity: Maize (Zea mays)
* Extracted Weight: 1,500.0 kg
* Origin Location: Bunia Depot
* Dialect Detected: Kiswahili (East African Agricultural Corridor)

2. Visual Crop Quality Assessment
* Identified Specimen: Yellow/Flint Maize (Zea mays indentata)
* Physical Characteristics: Intact kernel rows, fully dried golden husks, zero weevil perforation or mould detected.
* Moisture Rating: ~12.2% (Optimal storage & export grade)
* Quality Classification: Grade A Standard

3. Market Arbitrage Evaluation (Tool: fetch_market_rates)
* Border Trade Zone:           $0.45/kg -> Gross: $675.00 | Freight: $60.00 | Net: $615.00 [SELECTED - MAX ARBITRAGE]
* Coastal Wholesale Terminal:  $0.42/kg -> Gross: $630.00 | Freight: $60.00 | Net: $570.00 [Suboptimal: -$45.00]
* Central Market Hub:          $0.38/kg -> Gross: $570.00 | Freight: $60.00 | Net: $510.00 [Baseline: -$105.00]

4. Freight Dispatch Confirmation (Tool: dispatch_freight_booking)
* Booking Status: DISPATCH_CONFIRMED
* Carrier Fleet: East-West AgroLogistics Fleet
* Waybill ID: KILIMO-WB-63F15ADA
* Destination: Border Trade Zone Wholesale Terminal
* Estimated Transit Duration: 6 Hours
* Freight Logistics Cost: $60.00 USD ($0.04/kg)
* Net Farmer Payout: $615.00 USD

5. State Machine & Audit Trace
* Transaction ID: TX-KILIMO-884920F
* Security Armor: Gemma 2 (9B-IT) -> Verdict: SAFE (0.00 injection risk)
* Primary Orchestrator: Gemini 3.6 Flash Enterprise (Automatic Tool Calling)
* State Status: COMPLETED & Persisted to Cloud Firestore`
  },
  {
    id: "preset-cassava-french",
    title: "Cassava Lot (French Voice)",
    subtitle: "2,000 kg Cassava • Goma Hub • Grade A",
    category: "Cassava / Manioc",
    crop: "Cassava (Manihot esculenta)",
    volumeKg: 2000,
    location: "Goma Logistics Center",
    farmerId: "COOP-VIRUNGA-04",
    notes: "Racines de manioc fraîchement récoltées, haute teneur en amidon.",
    imagePath: "/samples/sample_maize_2.jpg",
    audioPath: "/samples/sample_voice.mp4",
    audioName: "voice_note_cassava_goma.mp4 (French)",
    imageName: "sample_cassava.jpg (Clean Root Stems)",
    simulationLedger: `### Execution Ledger: Transaction COOP-VIRUNGA-04

1. Audio Extraction & Verification
* Spoken Transcribed Excerpt: "Bonjour KilimoAgent, ici la coopérative Virunga à Goma. Nous avons un lot de 2 000 kg de manioc prêt pour expédition immédiate."
* Declared Commodity: Cassava (Manihot esculenta)
* Extracted Weight: 2,000.0 kg
* Origin Location: Goma Logistics Center
* Dialect Detected: French (RDC / Great Lakes Region)

2. Visual Crop Quality Assessment
* Identified Specimen: Cassava Tubers (High Starch Content)
* Physical Characteristics: Firm tubers, undamaged peel, low fibrous core, zero post-harvest rot detected.
* Moisture Rating: ~14.0% (Well-cured)
* Quality Classification: Grade A Standard

3. Market Arbitrage Evaluation (Tool: fetch_market_rates)
* Border Trade Zone:           $0.29/kg -> Gross: $580.00 | Freight: $80.00 | Net: $500.00 [SELECTED - MAX ARBITRAGE]
* Coastal Wholesale Terminal:  $0.26/kg -> Gross: $520.00 | Freight: $80.00 | Net: $440.00 [Suboptimal: -$60.00]
* Central Market Hub:          $0.22/kg -> Gross: $440.00 | Freight: $80.00 | Net: $360.00 [Baseline: -$140.00]

4. Freight Dispatch Confirmation (Tool: dispatch_freight_booking)
* Booking Status: DISPATCH_CONFIRMED
* Carrier Fleet: East-West AgroLogistics Fleet
* Waybill ID: KILIMO-WB-99B81A2C
* Destination: Border Trade Zone Wholesale Terminal
* Estimated Transit Duration: 5.5 Hours
* Freight Logistics Cost: $80.00 USD ($0.04/kg)
* Net Farmer Payout: $500.00 USD

5. State Machine & Audit Trace
* Transaction ID: TX-KILIMO-773918C
* Security Armor: Gemma 2 (9B-IT) -> Verdict: SAFE (0.00 injection risk)
* Primary Orchestrator: Gemini 3.6 Flash Enterprise (Automatic Tool Calling)
* State Status: COMPLETED & Persisted to Cloud Firestore`
  },
  {
    id: "preset-tomatoes-swahili",
    title: "Fresh Tomatoes (Swahili Voice)",
    subtitle: "800 kg Tomatoes • Bukavu Terminal • Grade A",
    category: "Tomatoes / Nyanya",
    crop: "Tomatoes (Solanum lycopersicum)",
    volumeKg: 800,
    location: "Bukavu Transit Depot",
    farmerId: "FARMER-KIVU-12",
    notes: "Nyanya mpya za shambani zimepakiwa kwenye kreti za mbao.",
    imagePath: "/samples/sample_maize_3.jpg",
    audioPath: "/samples/sample_voice.mp4",
    audioName: "voice_note_tomatoes_bukavu.mp4 (Swahili)",
    imageName: "sample_tomatoes.jpg (Firm Red Ripe)",
    simulationLedger: `### Execution Ledger: Transaction FARMER-KIVU-12

1. Audio Extraction & Verification
* Spoken Transcribed Excerpt: "Jambo KilimoAgent, mzigo wa nyanya kilo mia nane uko tayari hapa Bukavu depot. Tunahitaji lori la haraka kabla hazijaharibika."
* Declared Commodity: Tomatoes (Solanum lycopersicum)
* Extracted Weight: 800.0 kg
* Origin Location: Bukavu Transit Depot
* Dialect Detected: Kiswahili (Kivu Region)

2. Visual Crop Quality Assessment
* Identified Specimen: Ripe Salad Tomatoes (Deep Crimson)
* Physical Characteristics: Firm skin, uniform calyx, zero fungal spotting or crushing damage.
* Freshness Index: 96% (Grade A Fresh Market Spec)
* Quality Classification: Grade A Standard

3. Market Arbitrage Evaluation (Tool: fetch_market_rates)
* Coastal Wholesale Terminal:  $0.90/kg -> Gross: $720.00 | Freight: $32.00 | Net: $688.00 [SELECTED - MAX ARBITRAGE]
* Border Trade Zone:           $0.85/kg -> Gross: $680.00 | Freight: $32.00 | Net: $648.00 [Suboptimal: -$40.00]
* Central Market Hub:          $0.70/kg -> Gross: $560.00 | Freight: $32.00 | Net: $528.00 [Baseline: -$160.00]

4. Freight Dispatch Confirmation (Tool: dispatch_freight_booking)
* Booking Status: DISPATCH_CONFIRMED
* Carrier Fleet: FastTrack Cold-Chain Express
* Waybill ID: KILIMO-WB-44E29D81
* Destination: Coastal Wholesale Terminal
* Estimated Transit Duration: 4 Hours (Refrigerated)
* Freight Logistics Cost: $32.00 USD ($0.04/kg)
* Net Farmer Payout: $688.00 USD

5. State Machine & Audit Trace
* Transaction ID: TX-KILIMO-551930B
* Security Armor: Gemma 2 (9B-IT) -> Verdict: SAFE (0.00 injection risk)
* Primary Orchestrator: Gemini 3.6 Flash Enterprise (Automatic Tool Calling)
* State Status: COMPLETED & Persisted to Cloud Firestore`
  },
  {
    id: "preset-beans-english",
    title: "Beans Yield (English Voice)",
    subtitle: "1,200 kg Beans • Border Depot • Grade A",
    category: "Beans / Maharagwe",
    crop: "Dry Beans (Phaseolus vulgaris)",
    volumeKg: 1200,
    location: "Gisenyi Border Station",
    farmerId: "COOP-AGRI-RWANDA-09",
    notes: "Grade 1 clean dry red beans in standardized 50kg bags.",
    imagePath: "/samples/sample_maize.jpg",
    audioPath: "/samples/sample_voice.mp4",
    audioName: "voice_note_beans_gisenyi.mp4 (English)",
    imageName: "sample_beans.jpg (Polished Red Speckled)",
    simulationLedger: `### Execution Ledger: Transaction COOP-AGRI-RWANDA-09

1. Audio Extraction & Verification
* Spoken Transcribed Excerpt: "Hello KilimoAgent, this is the Gisenyi Border depot. We have 1,200 kg of premium red beans packed in 24 bags ready for dispatch."
* Declared Commodity: Dry Beans (Phaseolus vulgaris)
* Extracted Weight: 1,200.0 kg
* Origin Location: Gisenyi Border Station
* Dialect Detected: English (East African Regional Trade)

2. Visual Crop Quality Assessment
* Identified Specimen: Red Speckled Kidney Beans
* Physical Characteristics: Low moisture below 11%, zero stone contamination, uniform size grading.
* Quality Classification: Grade A Standard

3. Market Arbitrage Evaluation (Tool: fetch_market_rates)
* Border Trade Zone:           $0.80/kg -> Gross: $960.00 | Freight: $48.00 | Net: $912.00 [SELECTED - MAX ARBITRAGE]
* Coastal Wholesale Terminal:  $0.75/kg -> Gross: $900.00 | Freight: $48.00 | Net: $852.00 [Suboptimal: -$60.00]
* Central Market Hub:          $0.65/kg -> Gross: $780.00 | Freight: $48.00 | Net: $732.00 [Baseline: -$180.00]

4. Freight Dispatch Confirmation (Tool: dispatch_freight_booking)
* Booking Status: DISPATCH_CONFIRMED
* Carrier Fleet: East-West AgroLogistics Fleet
* Waybill ID: KILIMO-WB-11D55E77
* Destination: Border Trade Zone Wholesale Terminal
* Estimated Transit Duration: 5 Hours
* Freight Logistics Cost: $48.00 USD ($0.04/kg)
* Net Farmer Payout: $912.00 USD

5. State Machine & Audit Trace
* Transaction ID: TX-KILIMO-118833A
* Security Armor: Gemma 2 (9B-IT) -> Verdict: SAFE (0.00 injection risk)
* Primary Orchestrator: Gemini 3.6 Flash Enterprise (Automatic Tool Calling)
* State Status: COMPLETED & Persisted to Cloud Firestore`
  }
];
