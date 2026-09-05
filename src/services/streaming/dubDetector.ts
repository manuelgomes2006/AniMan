/**
 * Anime Dub Availability Detection Service
 * Dynamically checks whether an anime has an official English Dub available.
 * Caches results in memory and localStorage for instantaneous (0ms) lookups.
 */

const DUB_MEMORY_CACHE = new Map<number, boolean>();

// Comprehensive curated list of confirmed mainstream anime titles with English dubs
const KNOWN_DUB_PATTERNS = [
  'one piece',
  'naruto',
  'bleach',
  'attack on titan',
  'shingeki no kyojin',
  'demon slayer',
  'kimetsu no yaiba',
  'jujutsu kaisen',
  'solo leveling',
  'my hero academia',
  'boku no hero academia',
  'chainsaw man',
  'death note',
  'fullmetal alchemist',
  'hunter x hunter',
  'dragon ball',
  'spy x family',
  'tokyo ghoul',
  'cowboy bebop',
  'steins;gate',
  'steins gate',
  'mob psycho 100',
  'black clover',
  'vinland saga',
  'sword art online',
  'cyberpunk',
  'blue lock',
  'kaiju no. 8',
  'frieren',
  'mashle',
  'hell\'s paradise',
  'jigokuraku',
  'haikyuu',
  'dr. stone',
  'dr stone',
  'fire force',
  'overlord',
  'shield hero',
  're:zero',
  're zero',
  'konosuba',
  'mushoku tensei',
  'classroom of the elite',
  'bungo stray dogs',
  'code geass',
  'fate/zero',
  'fate/stay night',
  'assassination classroom',
  'tokyo revengers',
  'dungeon meshi',
  'delicious in dungeon',
  'wind breaker',
  'parasyte',
  'evangelion',
  'your name',
  'weathering with you',
  'suzume',
  'a silent voice',
  'spirited away',
  'howl\'s moving castle',
];

// Curated list of confirmed Sub-only anime (NO English dub produced)
const KNOWN_SUB_ONLY_PATTERNS = [
  'bocchi the rock',
  'asobi asobase',
  'grand blue',
  'monogatari',
  'bakemonogatari',
  'nisemonogatari',
  'kizumonogatari',
  'kono oto tomare',
  'chihayafuru',
  'nichijou',
  'daily lives of high school boys',
  'danshi koukousei',
  'saiki k', // Season 2 & Final are sub only
  'gintama: the final',
  'yuru camp',
  'laid-back camp',
  'non non biyori',
  'tatami galaxy',
  'ping pong the animation',
  'shouwa genroku rakugo',
  'march comes in like a lion',
  '3-gatsu no lion',
];

export async function checkAnimeDubAvailability(
  animeId: number,
  malId?: number,
  title?: string
): Promise<boolean> {
  const cacheKey = malId || animeId;
  if (!cacheKey) return true;

  // 1. Check in-memory cache
  if (DUB_MEMORY_CACHE.has(cacheKey)) {
    return DUB_MEMORY_CACHE.get(cacheKey)!;
  }

  // 2. Check persistent localStorage cache
  try {
    const local = localStorage.getItem(`aniworld_has_dub_${cacheKey}`);
    if (local !== null) {
      const parsed = local === 'true';
      DUB_MEMORY_CACHE.set(cacheKey, parsed);
      return parsed;
    }
  } catch {}

  // 3. Fast pattern matching by anime title
  const cleanTitle = (title || '').toLowerCase().trim();
  if (cleanTitle) {
    if (KNOWN_SUB_ONLY_PATTERNS.some((pattern) => cleanTitle.includes(pattern))) {
      saveDubResult(cacheKey, false);
      return false;
    }

    if (KNOWN_DUB_PATTERNS.some((pattern) => cleanTitle.includes(pattern))) {
      saveDubResult(cacheKey, true);
      return true;
    }
  }

  // 4. Query Jikan (MyAnimeList) characters & voice actors API with quick 2.5s timeout
  if (malId) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/characters`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const characters = json.data || [];

        if (Array.isArray(characters) && characters.length > 0) {
          // Check if any character has a registered English voice actor
          const hasEnglishVA = characters.some((char: any) =>
            char.voice_actors?.some((va: any) =>
              va.language?.toLowerCase() === 'english'
            )
          );

          saveDubResult(cacheKey, hasEnglishVA);
          return hasEnglishVA;
        }
      }
    } catch {
      // If Jikan times out or errors, continue to safe default
    }
  }

  // Default to true so we don't accidentally hide dub on unlisted dubs
  saveDubResult(cacheKey, true);
  return true;
}

function saveDubResult(cacheKey: number, hasDub: boolean): void {
  DUB_MEMORY_CACHE.set(cacheKey, hasDub);
  try {
    localStorage.setItem(`aniworld_has_dub_${cacheKey}`, hasDub ? 'true' : 'false');
  } catch {}
}
