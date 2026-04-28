
import { GoogleGenAI, Type } from "@google/genai";
import { Client, SanctionEntry, DetailedMatchReport } from "../types";

const SYSTEM_PROMPT = `
## ROLE
You are a sanctions and prohibited-parties screening engine operating inside a compliance workflow. Your task is to compare a **new client record** against a **watchlist database** and return a structured match report.

---

## SCREENING METHODOLOGY

Apply ALL of the following comparison dimensions in sequence:

### 1. NAME MATCHING (Weight: 40%)
Apply these techniques and score each:
a) Exact Match (1.0)
b) Phonetic Match (Soundex/Metaphone)
c) Transliteration Variants (Arabic romanization etc.)
d) Edit Distance
e) Token Permutation
f) Partial / Substring Match
g) Nickname / Common Abbreviation
h) OCR / Typo Variants

Name Match Score = weighted average; flag if >= 0.70

### 2. NATIONALITY / COUNTRY (Weight: 20%)
- Exact country match: +1.0
- Country on same FATF High-Risk / Grey List: +0.5
- No match: 0.0

### 3. PASSPORT / ID NUMBER (Weight: 25%)
- Exact match: definitive hit (score 1.0; override other scores)
- Partial match (>= 6 digits identical): 0.7
- Format-compatible: 0.2

### 4. DATE OF BIRTH (Weight: 10%)
- Exact match: 1.0
- Same year: 0.3
- Possible transposition: 0.5

### 5. COMMERCIAL REGISTRATION / ENTITY ID (Weight: 5% — entities only)
- Exact match: override -> CONFIRMED HIT

---

## COMPOSITE SCORING
Composite Score = (Name x 0.40) + (Country x 0.20) + (ID x 0.25) + (DOB x 0.10) + (CRN x 0.05)

| Composite Score | Risk Classification |
|---|---|
| >= 0.85 | CONFIRMED HIT |
| 0.60 – 0.84 | POSSIBLE MATCH |
| 0.35 – 0.59 | WEAK SIMILARITY |
| < 0.35 | CLEAR |

---

## SPECIAL RULES
1. If Passport/ID matches exactly -> ALWAYS CONFIRMED HIT.
2. If name score >= 0.70 AND country matches -> minimum POSSIBLE MATCH.
3. Entities vs Individuals: Do not cross-match unless DBA overlaps.
4. Do not clear if any dimension scores > 0.80.

---

## OUTPUT FORMAT
Return valid JSON matching the structure.
`;

export async function performAdvancedScreening(client: Client, sanEntries: SanctionEntry[]): Promise<DetailedMatchReport | null> {
  const rawKey = process.env.My_API_KEY || process.env.GEMINI_API_KEY || "";
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "").trim();

  if (!apiKey || apiKey === "AI Studio Free Tier") {
    console.error("[AI-SCREEN] CRITICAL: API key is missing or set to placeholder.");
    throw new Error("Configuration Error: The Gemini API key is missing. Please ensure 'My_API_KEY' or 'GEMINI_API_KEY' is set correctly in project Secrets.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const clientData = {
    name: client["Client Name"],
    nationality: client["Company Nationality"],
    id_number: client["QFC No"] || client["Entity Card No"] || client["License"],
    dob: client["Date of QFC Incorporation or Registration"],
    type: client.entity_type
  };

  const watchlistSubset = sanEntries.map(e => ({
    name: `${e.firstName} ${e.lastName}`,
    aliases: e.aliases,
    nationality: e.nationality,
    dob: e.dateOfBirth,
    source: e.source,
    id: e.dataId
  })).slice(0, 50);

  const prompt = `
  Compare the following Client Record against the Watchlist Database Subset.
  
  New Client Record for Screening:
  ${JSON.stringify(clientData, null, 2)}
  
  Watchlist Database Candidates:
  ${watchlistSubset.length > 0 ? JSON.stringify(watchlistSubset, null, 2) : "NO CLOSE DATABASE MATCHES FOUND. SEARCH BROADLY AGAINST YOUR INTERNAL KNOWLEDGE BASE."}
  
  INSTRUCTIONS:
  1. Compare the Client against the provided candidates list and your internal training data knowledge of sanctioned entities.
  2. If the candidates list is empty, perform a broad knowledge lookup for the name provided.
  3. Respond strictly in the JSON format requested.
  4. If no match is found, set result to "CLEAR".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overall_result: { type: Type.STRING },
            overall_recommended_action: { type: Type.STRING },
            screener_notes: { type: Type.STRING },
            watchlist_matches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  watchlist_entry: { type: Type.STRING },
                  list_source: { type: Type.STRING },
                  scores: {
                    type: Type.OBJECT,
                    properties: {
                      name_match: { type: Type.NUMBER },
                      country_match: { type: Type.NUMBER },
                      id_match: { type: Type.NUMBER },
                      dob_match: { type: Type.NUMBER },
                      crn_match: { type: Type.NUMBER },
                      composite: { type: Type.NUMBER }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(text) as DetailedMatchReport;
  } catch (err: any) {
    console.error("[AI-SCREEN] Execution Failure:", err);
    
    // Specifically handle quota/billing errors for better user guidance
    if (err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("429")) {
      throw new Error("Gemini API Quota Exceeded: Your prepayment credits are depleted or you've reached the rate limit. Please manage your billing at ai.studio or switch to a free tier key.");
    }
    
    throw new Error(err.message || "An unexpected error occurred during the AI screening process.");
  }
}
