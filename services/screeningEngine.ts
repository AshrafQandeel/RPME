
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
  
  let bestMatch = {
    score: 0,
    sanction: null as SanctionEntry | null,
    matchType: 'No Match'
  };

  for (const entry of sanctions) {
    let currentScore = 0;
    const entryFullName = `${entry.firstName} ${entry.secondName} ${entry.thirdName} ${entry.lastName}`.trim().toUpperCase();
    const sTokens = entryFullName.split(/\s+/).filter(t => t.length > 1 && !CORPORATE_NOISE.includes(t));

    // 1. Direct similarity check
    const similarity = calculateSimilarity(clientName, entryFullName);
    
    // 2. Token Consensus Check (More robust for multi-part names)
    let matchedTokens = 0;
    for (const ct of cTokens) {
      // Threshold 0.70 allows more significant typos (e.g., JAMeL vs JAMAL, ZEINIeE vs ZEINIYE)
      if (sTokens.some(st => st === ct || calculateSimilarity(ct, st) >= 0.70)) {
        matchedTokens++;
      }
    }

    const tokenRatio = cTokens.length > 0 ? matchedTokens / cTokens.length : 0;
    const sanctionTokenRatio = sTokens.length > 0 ? matchedTokens / sTokens.length : 0;

    // SCORING LOGIC v24.0 - Aggressive for Typos & Partial Names
    if (clientName === entryFullName) {
      currentScore = 98; 
    } else if (tokenRatio >= 0.90 && sanctionTokenRatio >= 0.80) {
      currentScore = 95; // High consensus
    } else if (similarity >= 0.85) {
      currentScore = 90; // Strong fuzzy match
    } else if (tokenRatio >= 0.80 && matchedTokens >= 2) {
      currentScore = 85; // Most user tokens match (Catch typos like JAMeL ZEINIeE)
    } else if (tokenRatio >= 0.60 && sanctionTokenRatio >= 0.50) {
      currentScore = 75; // Significant overlap (at least half of sanction record)
    } else if (tokenRatio >= 0.5 || similarity >= 0.5) {
      currentScore = 60; // Moderate risk
    } else if (matchedTokens >= 2) {
      currentScore = 50; // Multiple name parts matched fuzzy
    } else if (matchedTokens >= 1 && (cTokens.length <= 1)) {
      currentScore = 40; // Single token match but it's the only one provided
    } else if (matchedTokens >= 1 && (sTokens.length <= 2)) {
      currentScore = 30; // Weak but present
    }

    // 3. Alias Check
    if (currentScore < 80 && entry.aliases && entry.aliases.length > 0) {
      for (const alias of entry.aliases) {
        const aSimilarity = calculateSimilarity(clientName, alias.toUpperCase());
        if (aSimilarity >= 0.90) {
          currentScore = Math.max(currentScore, 85);
          break;
        }
      }
    }

    // 4. Identity Multipliers
    if (currentScore >= 30) {
      // Nationality match adds confidence
      if (clientNationality && entry.nationality.toUpperCase().includes(clientNationality)) {
        currentScore += 10;
      }
      
      // Entity Type match adds confidence
      if (client.entity_type === entry.type) {
        currentScore += 5;
      }
    }

    if (currentScore > bestMatch.score) {
      bestMatch = { 
        score: Math.min(currentScore, 100), 
        sanction: entry,
        matchType: currentScore >= 80 ? 'High Confidence Match' : 
                   currentScore >= 50 ? 'Probabilistic Match' : 'Possible Match'
      };
    }
  }

  // Realistic Risk Assignment
  let riskLevel = RiskLevel.NONE;
  if (bestMatch.score >= 75) riskLevel = RiskLevel.HIGH;
  else if (bestMatch.score >= 45) riskLevel = RiskLevel.MEDIUM;
  else if (bestMatch.score >= 20) riskLevel = RiskLevel.LOW;

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
