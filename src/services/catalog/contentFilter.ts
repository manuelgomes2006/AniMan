import { AnimeMedia } from '../../types/anime';

/**
 * Centralized Adult & Hentai Content Filtering Engine
 * Evaluates explicit adult flags, genres, tags, ratings, and fallback keywords.
 */

// Explicit adult/hentai genre names (case-insensitive)
const ADULT_GENRES = new Set([
  'hentai',
  'erotica',
  'adult'
]);

// Explicit adult/hentai tag names (case-insensitive)
const ADULT_TAGS = new Set([
  'hentai',
  'erotica',
  'nsfw',
  'explicit content',
  'incest',
  'sm',
  'bdsm'
]);

// Fallback title / synonym keyword triggers (case-insensitive)
const ADULT_KEYWORDS = [
  'hentai',
  'erotica',
  'uncensored hentai',
  'x-rated'
];

/**
 * Returns true if the anime is safe/allowed for display.
 * Returns false if the anime is identified as adult/hentai.
 */
export function isAllowedAnime(anime: any): boolean {
  if (!anime || typeof anime !== 'object') return false;

  // 1. Explicit API adult flag check (AniList isAdult = true)
  if (anime.isAdult === true) {
    return false;
  }

  // Jikan / MyAnimeList rating check (Rx, R18+, Hentai)
  if (anime.rating && typeof anime.rating === 'string') {
    const r = anime.rating.toLowerCase();
    if (r.includes('rx') || r.includes('hentai') || r.includes('r18+')) {
      return false;
    }
  }

  // 2. Genres check
  if (Array.isArray(anime.genres)) {
    for (const g of anime.genres) {
      if (typeof g === 'string' && ADULT_GENRES.has(g.trim().toLowerCase())) {
        return false;
      }
    }
  }

  // 3. Tags check
  if (Array.isArray(anime.tags)) {
    for (const t of anime.tags) {
      if (!t) continue;
      if (typeof t === 'string' && ADULT_TAGS.has(t.trim().toLowerCase())) {
        return false;
      }
      if (typeof t === 'object') {
        if (t.isAdult === true) return false;
        if (t.name && typeof t.name === 'string' && ADULT_TAGS.has(t.name.trim().toLowerCase())) {
          return false;
        }
      }
    }
  }

  // 4. Title and synonym fallback keyword matching
  const titlesToTest: string[] = [];
  if (anime.title) {
    if (typeof anime.title === 'string') {
      titlesToTest.push(anime.title);
    } else if (typeof anime.title === 'object') {
      if (typeof anime.title.english === 'string') titlesToTest.push(anime.title.english);
      if (typeof anime.title.romaji === 'string') titlesToTest.push(anime.title.romaji);
      if (typeof anime.title.native === 'string') titlesToTest.push(anime.title.native);
    }
  }
  if (Array.isArray(anime.synonyms)) {
    anime.synonyms.forEach((syn: any) => {
      if (typeof syn === 'string') titlesToTest.push(syn);
    });
  }

  for (const titleText of titlesToTest) {
    if (typeof titleText !== 'string') continue;
    const lower = titleText.toLowerCase();
    for (const kw of ADULT_KEYWORDS) {
      if (lower.includes(kw)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Filter an array of AnimeMedia (or items containing anime/media/WatchProgress) to return ONLY allowed/non-adult items
 */
export function filterAllowedAnimeList<T>(list: T[]): T[] {
  if (!Array.isArray(list)) return [];
  return list.filter((item: any) => {
    if (!item) return false;
    if (item.animeId && typeof item.title === 'string') {
      return isAllowedAnime({ id: item.animeId, title: item.title });
    }
    const media = item.anime || item.media || item;
    return isAllowedAnime(media);
  });
}
