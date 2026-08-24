export interface AnimeMapping {
  internalId: string;
  aniListId?: number;
  malId?: number;
  providerId?: string;
  normalizedTitle: string;
  englishTitle?: string;
  romajiTitle?: string;
  nativeTitle?: string;
  year?: number;
  season?: string;
  format?: string;
}

// Title normalization preserving critical season indicators
export function normalizeTitle(title: string): string {
  if (!title) return '';

  let normalized = title.toLowerCase();

  // Normalize colons and hyphens while retaining season numbers
  normalized = normalized
    .replace(/:\s*/g, ' ')
    .replace(/-\s*/g, ' ')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

// Match anime candidates using weighted signal ranking
export function matchAnimeCandidate(
  queryTitle: string,
  candidates: { id: number; malId?: number; title: { english?: string; romaji?: string; native?: string } }[]
): { candidate?: any; score: number } {
  if (!queryTitle || !candidates || candidates.length === 0) {
    return { score: 0 };
  }

  const normQuery = normalizeTitle(queryTitle);
  let bestCandidate: any = null;
  let highestScore = 0;

  for (const candidate of candidates) {
    let score = 0;
    const eng = normalizeTitle(candidate.title?.english || '');
    const rom = normalizeTitle(candidate.title?.romaji || '');
    const nat = normalizeTitle(candidate.title?.native || '');

    if (normQuery === eng) score += 100;
    else if (normQuery === rom) score += 95;
    else if (normQuery === nat) score += 90;
    else if (eng.startsWith(normQuery) || rom.startsWith(normQuery)) score += 75;
    else if (eng.includes(normQuery) || rom.includes(normQuery)) score += 50;

    if (score > highestScore) {
      highestScore = score;
      bestCandidate = candidate;
    }
  }

  return { candidate: bestCandidate, score: highestScore };
}
