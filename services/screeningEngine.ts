
import { Client, SanctionEntry, MatchResult, RiskLevel } from '../types';

/**
 * Words that dilude identity uniqueness. 
 * Updated v21.2.0 to include regional and legal identifiers (SDN, BHD, BERHAD, PRIVATE).
 */
const CORPORATE_NOISE = [
  'CO', 'LTD', 'CORP', 'INC', 'INTERNATIONAL', 'SHIPPING', 'AGENCY', 'UNITED', 
  'AND', 'FOR', 'THE', 'LIMITED', 'GROUP', 'COMPANY', 'LLC', 'PVT', 'FZE', 
  'PLC', 'SERVICES', 'TRADING', 'MARITIME', 'MANAGEMENT', 'INVESTMENT', 
  'HOLDINGS', 'TRUST', 'PARTNERS', 'L.L.C', 'L.T.D', 'CO.', 'CO.,',
  'SDN', 'BHD', 'BERHAD', 'PRIVATE', 'PTY', 'PT'
];

const levenshtein = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
};

const calculateSimilarity = (s1: string, s2: string): number => {
  if (!s1 || !s2) return 0;
  const str1 = s1.trim().toLowerCase();
  const str2 = s2.trim().toLowerCase();
  if (str1 === str2) return 1.0;
  if (str1.includes(str2) || str2.includes(str1)) return 0.95;
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  return (longer.length - levenshtein(longer, shorter)) / longer.length;
};

export const screenClient = (client: Client, sanctions: SanctionEntry[]): MatchResult | null => {
  if (!sanctions.length) return null;

  const clientNameRaw = (client["Client Name"] || "").trim().toUpperCase();
  const clientName = clientNameRaw.replace(/[().,'"]/g, ' ').replace(/\s+/g, ' ').trim();
  const clientNationality = (client["Company Nationality"] || '').toUpperCase();
  const cTokens = clientName.split(/\s+/).filter(t => t.length > 1 && !CORPORATE_NOISE.includes(t));
  
  let bestMatch: {
    score: number;
    sanction: SanctionEntry | null;
    matchType: string;
    scores?: any;
  } = {
    score: 0,
    sanction: null as SanctionEntry | null,
    matchType: 'No Match'
  };

  for (const entry of sanctions) {
    const entryFullName = [entry.firstName, entry.secondName, entry.thirdName, entry.lastName]
      .filter(Boolean)
      .join(' ')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
    const sTokens = entryFullName.split(/\s+/).filter(t => t.length > 1 && !CORPORATE_NOISE.includes(t));

    // DIMENSION SCORING
    
    // 1. NAME MATCHING (Weight: 40%)
    const nameSimilarity = calculateSimilarity(clientName, entryFullName);
    let name_match = nameSimilarity;
    
    // Token check for name score boost
    let matchedTokens = 0;
    const meaningfulTokens = cTokens.length;
    for (const ct of cTokens) {
      if (sTokens.some(st => st === ct || calculateSimilarity(ct, st) >= 0.85)) {
        matchedTokens++;
      }
    }
    const tokenRatio = meaningfulTokens > 0 ? matchedTokens / meaningfulTokens : 0;
    
    // If we have a very high token ratio, it's likely a hit
    if (tokenRatio > name_match) name_match = tokenRatio;

    // Special case for exact substring match (important for entities like "Special Industries Group")
    if (clientName.includes(entryFullName) || entryFullName.includes(clientName)) {
      if (name_match < 0.90) name_match = 0.90;
    }

    // 2. NATIONALITY / COUNTRY (Weight: 20%)
    let country_match = 0;
    if (clientNationality && entry.nationality.toUpperCase().includes(clientNationality)) {
      country_match = 1.0;
    }

    // 3. PASSPORT / ID NUMBER (Weight: 20%)
    let id_match = 0;
    if (client["QFC No"] && entry.referenceNumber.includes(client["QFC No"])) {
        id_match = 1.0;
    }

    // 4. DATE OF BIRTH (Weight: 10%)
    let dob_match = 0;
    if (client["Date of QFC Incorporation or Registration"] && entry.dateOfBirth) {
        if (client["Date of QFC Incorporation or Registration"] === entry.dateOfBirth) {
            dob_match = 1.0;
        } else if (client["Date of QFC Incorporation or Registration"].substring(0, 4) === entry.dateOfBirth.substring(0, 4)) {
            dob_match = 0.3;
        }
    }

    // 5. CRN (Weight: 10%)
    let crn_match = 0;
    if (client["QFC No"] && entry.referenceNumber === client["QFC No"]) {
        crn_match = 1.0;
    }

    // COMPOSITE SCORING
    // Name is prioritized - if name match is high, we want hits to surface
    let composite = (name_match * 0.40) + (country_match * 0.20) + (id_match * 0.20) + (dob_match * 0.10) + (crn_match * 0.10);
    
    // AGGRESSIVE OVERRIDE: If the name match is very high, it's very likely a hit regardless of other data
    if (name_match >= 0.95) {
      composite = Math.max(composite, 0.95);
    } else if (name_match >= 0.85) {
      composite = Math.max(composite, 0.75);
    }
    
    // Risk Classification
    let risk_classification = "CLEAR";
    if (composite >= 0.80 || id_match === 1.0 || crn_match === 1.0 || name_match >= 0.95) risk_classification = "CONFIRMED HIT";
    else if (composite >= 0.50 || name_match >= 0.80 || (name_match >= 0.60 && country_match === 1.0)) risk_classification = "POSSIBLE MATCH";
    else if (composite >= 0.30 || name_match >= 0.50) risk_classification = "WEAK SIMILARITY";

    const scorePct = composite * 100;

    if (scorePct > bestMatch.score) {
      bestMatch = { 
        score: Math.min(scorePct, 100), 
        sanction: entry,
        matchType: risk_classification,
        scores: {
            name_match,
            country_match,
            id_match,
            dob_match,
            crn_match,
            composite
        }
      };
    }
  }

  // Realistic Risk Assignment
  let riskLevel = RiskLevel.NONE;
  if (bestMatch.matchType === "CONFIRMED HIT") riskLevel = RiskLevel.HIGH;
  else if (bestMatch.matchType === "POSSIBLE MATCH") riskLevel = RiskLevel.MEDIUM;
  else if (bestMatch.matchType === "WEAK SIMILARITY") riskLevel = RiskLevel.LOW;

  if (bestMatch.sanction && riskLevel !== RiskLevel.NONE) {
    return {
      clientId: client.id,
      sanctionId: bestMatch.sanction.dataId,
      score: bestMatch.score,
      riskLevel,
      matchedFields: [bestMatch.matchType],
      matchedRecord: bestMatch.sanction,
      timestamp: new Date().toISOString()
    };
  }

  return null;
};
