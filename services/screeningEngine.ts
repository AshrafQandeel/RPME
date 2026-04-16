
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

const isHighRiskMatch = (clientName: string, sanctionedName: string): { isMatch: boolean; type: string } => {
  const cNorm = clientName.toUpperCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ");
  const sNorm = sanctionedName.toUpperCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ");

  // 1. Exact Identity Comparison
  if (cNorm.trim() === sNorm.trim()) return { isMatch: true, type: 'Exact Match' };
  
  // 2. Numeric Cross-Reference
  const numericFragments = cNorm.match(/\d{4,}/g) || [];
  for (const num of numericFragments) {
    if (sNorm.includes(num)) return { isMatch: true, type: 'Numeric ID Match' };
  }

  // 3. Salient Token Consensus
  const cTokens = cNorm.split(/\s+/).filter(t => t.length > 1 && !CORPORATE_NOISE.includes(t));
  const sTokens = sNorm.split(/\s+/).filter(t => t.length > 1 && !CORPORATE_NOISE.includes(t));

  if (sTokens.length === 0) return { isMatch: false, type: 'No Match' };

  let salientMatches = 0;
  for (const st of sTokens) {
    // THRESHOLD ADJUSTMENT v21.2.0: 0.80 to catch character variations in salient words (SaNRISE vs SUNRISE)
    if (cTokens.some(ct => ct === st || calculateSimilarity(ct, st) >= 0.80)) {
      salientMatches++;
    }
  }
  
  // Rule: High-consensus token match (most of the name matches)
  if (salientMatches >= 2 || (sTokens.length === 1 && salientMatches === 1)) {
    return { isMatch: true, type: 'Salience Match' };
  }

  // 4. Global Fuzzy Fallback (Authoritative Catch-all)
  const fuzzy = calculateSimilarity(cNorm, sNorm);
  if (fuzzy > 0.45) return { isMatch: true, type: 'Fuzzy Similarity' };

  return { isMatch: false, type: 'No Match' };
};

export const screenClient = (client: Client, sanctions: SanctionEntry[]): MatchResult | null => {
  if (!sanctions.length) return null;

  const clientName = (client["Client Name"] || "").trim().toUpperCase();
  const clientNationality = (client["Company Nationality"] || '').toUpperCase();
  
  let bestMatch = {
    score: 0,
    sanction: null as SanctionEntry | null,
    matchType: 'No Match'
  };

  for (const entry of sanctions) {
    let currentScore = 0;
    const entryFullName = `${entry.firstName} ${entry.secondName} ${entry.thirdName} ${entry.lastName}`.trim().toUpperCase();

    // 1. Name Matching (Fuzzy/Token based)
    const similarity = calculateSimilarity(clientName, entryFullName);
    if (entryFullName === clientName) {
      currentScore += 70; // Exact full name match
    } else if (similarity >= 0.85) {
      currentScore += 60; // Very high similarity
    } else if (similarity >= 0.50) {
      currentScore += 30; // Partial match
    }

    // 2. Nationality Match
    if (clientNationality && entry.nationality.toUpperCase().includes(clientNationality)) {
      currentScore += 20;
    }

    // 3. Entity Type Match
    if (client.entity_type === entry.type) {
      currentScore += 10;
    }

    if (currentScore > bestMatch.score) {
      bestMatch = { 
        score: currentScore, 
        sanction: entry,
        matchType: currentScore >= 70 ? 'High Confidence Match' : 'Probabilistic Match'
      };
    }
  }

  // Realistic Risk Assignment
  let riskLevel = RiskLevel.NONE;
  if (bestMatch.score >= 85) riskLevel = RiskLevel.HIGH;
  else if (bestMatch.score >= 50) riskLevel = RiskLevel.MEDIUM;
  else if (bestMatch.score >= 20) riskLevel = RiskLevel.LOW;

  if (bestMatch.sanction && riskLevel !== RiskLevel.NONE) {
    return {
      clientId: client.id,
      sanctionId: bestMatch.sanction.dataId,
      score: bestMatch.score,
      riskLevel,
      matchedFields: [bestMatch.matchType],
      timestamp: new Date().toISOString()
    };
  }

  return null;
};
