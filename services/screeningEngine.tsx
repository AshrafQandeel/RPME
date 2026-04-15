
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
  let bestMatch: MatchResult | null = null;
  let highestScore = 0;
  const clientName = (client["Client Name"] || "").trim().toUpperCase();
  if (!clientName) return null;

  for (const sanction of sanctions) {
    const sFullName = [sanction.firstName, sanction.secondName, sanction.thirdName, sanction.lastName]
      .filter(Boolean).join(' ').trim().toUpperCase();
    
    // Check main name, data ID, reference number, and aliases
    const checkNames = [
      (sanction.referenceNumber || '').toUpperCase(), 
      (sanction.dataId || '').toUpperCase(),
      sFullName, 
      ...(sanction.aliases || []).map(a => a.toUpperCase())
    ].filter(Boolean);
    
    for (const sName of checkNames) {
      const { isMatch, type } = isHighRiskMatch(clientName, sName);
      if (isMatch) {
        const score = Math.round(calculateSimilarity(clientName, sName) * 100);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = { 
            clientId: client.id, 
            sanctionId: sanction.dataId, 
            score, 
            riskLevel: RiskLevel.HIGH, 
            matchedFields: [type], 
            timestamp: new Date().toISOString() 
          };
        }
      }
    }
  }
  return bestMatch;
};
