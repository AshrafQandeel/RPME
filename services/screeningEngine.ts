import { Client, SanctionEntry, MatchResult, RiskLevel } from '../types';

// Simple Levenshtein distance implementation
const levenshtein = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

const calculateSimilarity = (s1: string, s2: string): number => {
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (longer.length - levenshtein(longer.toLowerCase(), shorter.toLowerCase())) / longer.length;
};

export const screenClient = (client: Client, sanctions: SanctionEntry[]): MatchResult | null => {
  let bestMatch: MatchResult | null = null;
  let highestScore = 0;

  for (const sanction of sanctions) {
    // 1. Name Match
    const clientFullName = `${client.firstName} ${client.middleName || ''} ${client.lastName}`.replace(/\s+/g, ' ').trim();
    
    // Construct sanction full name parts
    const sanctionNameParts = [sanction.firstName, sanction.secondName, sanction.thirdName, sanction.lastName].filter(Boolean).join(' ');
    
    // Check main name and aliases
    const namesToCheck = [sanctionNameParts, ...sanction.aliases];
    
    let maxNameScore = 0;
    for (const name of namesToCheck) {
        const score = calculateSimilarity(clientFullName, name);
        if (score > maxNameScore) maxNameScore = score;
    }

    // 2. Nationality Correlation
    let nationalityMatch = false;
    if (client.nationality && sanction.nationality) {
        if (sanction.nationality.toLowerCase().includes(client.nationality.toLowerCase())) {
            nationalityMatch = true;
        }
    }

    // 3. DOB Match (Exact)
    let dobMatch = false;
    if (client.dob && sanction.dateOfBirth) {
        // Simple string comparison for simplified demo. In real app, parse dates.
        if (client.dob === sanction.dateOfBirth) {
            dobMatch = true;
        }
    }

    // Scoring Logic
    let finalScore = maxNameScore * 100;
    
    // Boost score if secondary fields match
    if (finalScore > 60) {
        if (nationalityMatch) finalScore += 10;
        if (dobMatch) finalScore += 20;
    }

    if (finalScore > highestScore) {
        highestScore = finalScore;
        
        let risk = RiskLevel.NONE;
        if (finalScore >= 90) risk = RiskLevel.HIGH;
        else if (finalScore >= 70) risk = RiskLevel.MEDIUM;
        else if (finalScore >= 50) risk = RiskLevel.LOW;

        if (risk !== RiskLevel.NONE) {
            bestMatch = {
                clientId: client.id,
                sanctionId: sanction.dataId,
                score: Math.min(finalScore, 100),
                riskLevel: risk,
                matchedFields: [
                    maxNameScore > 0.8 ? 'Name' : '',
                    nationalityMatch ? 'Nationality' : '',
                    dobMatch ? 'Date of Birth' : ''
                ].filter(Boolean),
                timestamp: new Date().toISOString()
            };
        }
    }
  }

  return bestMatch;
};