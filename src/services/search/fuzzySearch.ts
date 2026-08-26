/**
 * Fast Levenshtein Distance & String Similarity Utility for Typo-Tolerant Anime Search
 */

// Calculate Levenshtein Distance between two strings
export function levenshteinDistance(a: string, b: string): number {
  const strA = a.toLowerCase().trim();
  const strB = b.toLowerCase().trim();

  if (strA === strB) return 0;
  if (strA.length === 0) return strB.length;
  if (strB.length === 0) return strA.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= strB.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= strA.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= strB.length; i++) {
    for (let j = 1; j <= strA.length; j++) {
      if (strB.charAt(i - 1) === strA.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[strB.length][strA.length];
}

// Calculate similarity score between 0.0 and 1.0 (1.0 = exact match)
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Substring containment boost
  if (s1.length >= 3 && s2.includes(s1)) return 0.95;
  if (s2.length >= 3 && s1.includes(s2)) return 0.95;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return 1.0 - distance / maxLen;
}

// Popular Anime Dictionary for instant typo correction
export const POPULAR_ANIME_DICTIONARY = [
  'Naruto',
  'Naruto Shippuden',
  'Boruto: Naruto Next Generations',
  'One Piece',
  'Demon Slayer: Kimetsu no Yaiba',
  'Jujutsu Kaisen',
  'Attack on Titan',
  'Solo Leveling',
  'Death Note',
  'Bleach',
  'Bleach: Thousand-Year Blood War',
  'My Hero Academia',
  'Dragon Ball Z',
  'Dragon Ball Super',
  'Hunter x Hunter',
  'Chainsaw Man',
  'Frieren: Beyond Journey\'s End',
  'Fullmetal Alchemist: Brotherhood',
  'Tokyo Ghoul',
  'Sword Art Online',
  'Spy x Family',
  'Cyberpunk: Edgerunners',
  'Black Clover',
  'Steins;Gate',
  'Code Geass',
  'Fairy Tail',
  'Vinland Saga',
  'Mob Psycho 100',
  'One Punch Man',
  'Haikyuu!!',
  'JoJo\'s Bizarre Adventure',
  'Gintama',
  'Neon Genesis Evangelion',
  'Cowboy Bebop',
  'Overlord',
  'Classroom of the Elite',
  'Blue Lock',
  'Demon Slayer',
  'Monster',
  'Baki',
  'Kaguya-sama: Love is War',
  'No Game No Life',
  'Re:ZERO -Starting Life in Another World-',
  'The Seven Deadly Sins',
  'Tate no Yuusha no Nariagari',
  'Fire Force',
  'Dr. STONE',
  'Tokyo Revengers',
  'Kaiju No. 8',
  'Dandadan',
  'Mashle: Magic and Muscles'
];

export interface TypoCorrectionResult {
  hasTypo: boolean;
  originalQuery: string;
  suggestedQuery: string | null;
  confidence: number;
}

/**
 * Finds the closest matching anime title for a misspelled search query.
 */
export function findTypoCorrection(query: string, customDictionary: string[] = []): TypoCorrectionResult {
  const clean = query.trim().toLowerCase();
  if (!clean || clean.length < 3) {
    return { hasTypo: false, originalQuery: query, suggestedQuery: null, confidence: 0 };
  }

  const combinedDict = Array.from(new Set([...POPULAR_ANIME_DICTIONARY, ...customDictionary]));
  let bestMatch: string | null = null;
  let highestSimilarity = 0;

  for (const candidate of combinedDict) {
    const candidateLower = candidate.toLowerCase();

    // Exact or prefix match needs no correction
    if (candidateLower === clean || candidateLower.startsWith(clean)) {
      return { hasTypo: false, originalQuery: query, suggestedQuery: null, confidence: 1.0 };
    }

    // Word token matching (e.g. "Nartuo Shippuden" -> "Naruto")
    const candidateWords = candidateLower.split(/\s+/);
    const queryWords = clean.split(/\s+/);

    for (const qWord of queryWords) {
      if (qWord.length < 3) continue;
      for (const cWord of candidateWords) {
        if (cWord.length < 3) continue;

        const distance = levenshteinDistance(qWord, cWord);
        // Allow up to 2 character edits for typo correction
        if (distance > 0 && distance <= 2) {
          const sim = calculateSimilarity(qWord, cWord);
          if (sim > highestSimilarity && sim >= 0.65) {
            highestSimilarity = sim;
            bestMatch = candidate;
          }
        }
      }
    }

    // Overall title similarity
    const overallSim = calculateSimilarity(clean, candidateLower);
    if (overallSim > highestSimilarity && overallSim >= 0.60) {
      highestSimilarity = overallSim;
      bestMatch = candidate;
    }
  }

  if (bestMatch && highestSimilarity >= 0.65) {
    return {
      hasTypo: true,
      originalQuery: query,
      suggestedQuery: bestMatch,
      confidence: highestSimilarity
    };
  }

  return {
    hasTypo: false,
    originalQuery: query,
    suggestedQuery: null,
    confidence: 0
  };
}
