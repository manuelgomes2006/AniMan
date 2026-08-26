import { AnimeMedia, AniListPageResponse } from '../../types/anime';
import { normalizeTitle } from '../mapping/mapping';
import { findTypoCorrection, calculateSimilarity } from '../search/fuzzySearch';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in-memory & local cache

// Dynamic titles cache harvested from API calls to build an adaptive dictionary
const dynamicTitleDictionary = new Set<string>();

// High-speed persistent local storage cache helper
function getCachedData<T>(key: string): T | null {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL) {
    return mem.data as T;
  }
  try {
    const local = localStorage.getItem(`aniworld_cache_${key}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        memoryCache.set(key, parsed);
        return parsed.data as T;
      }
    }
  } catch {}
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  const item = { data, timestamp: Date.now() };
  memoryCache.set(key, item);
  try {
    localStorage.setItem(`aniworld_cache_${key}`, JSON.stringify(item));
  } catch {}
}

// Harvest titles to continuously expand dictionary
function registerTitlesInDictionary(mediaList: AnimeMedia[]) {
  if (!mediaList || !Array.isArray(mediaList)) return;
  for (const item of mediaList) {
    if (item.title?.english) dynamicTitleDictionary.add(item.title.english);
    if (item.title?.romaji) dynamicTitleDictionary.add(item.title.romaji);
  }
}

// High-quality fallback anime dataset guaranteeing zero blank screens
const FALLBACK_ANIME_DATA: AnimeMedia[] = [
  {
    id: 151807,
    idMal: 52299,
    title: { english: 'Solo Leveling', romaji: 'Ore dake Hairou na Ken', native: '俺だけレベルアップな件' },
    coverImage: { extraLarge: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80', large: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80' },
    bannerImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
    description: 'In a world where hunters, humans who possess magical powers, must battle deadly monsters to protect mankind from certain annihilation.',
    format: 'TV',
    episodes: 12,
    duration: 24,
    status: 'RELEASING',
    seasonYear: 2024,
    genres: ['Action', 'Adventure', 'Fantasy'],
    averageScore: 89,
    malScore: 8.9,
    aniListScore: 89,
    popularity: 150000
  },
  {
    id: 20,
    idMal: 20,
    title: { english: 'Naruto', romaji: 'Naruto', native: 'ナルト' },
    coverImage: { extraLarge: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80', large: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80' },
    bannerImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
    description: 'Moments prior to Naruto Uzumaki\'s birth, a huge demon known as the Kyuubi, the Nine-Tailed Fox, attacked Konohagakure, the Hidden Leaf Village, and wreaked havoc.',
    format: 'TV',
    episodes: 220,
    duration: 24,
    status: 'FINISHED',
    seasonYear: 2002,
    genres: ['Action', 'Adventure', 'Fantasy'],
    averageScore: 83,
    malScore: 8.3,
    aniListScore: 83,
    popularity: 220000
  },
  {
    id: 21,
    idMal: 21,
    title: { english: 'One Piece', romaji: 'One Piece', native: 'ONE PIECE' },
    coverImage: { extraLarge: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80', large: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80' },
    bannerImage: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
    description: 'Monkey D. Luffy sails with his crew of Straw Hat Pirates to find the legendary treasure One Piece and become King of the Pirates.',
    format: 'TV',
    episodes: 1120,
    duration: 24,
    status: 'RELEASING',
    seasonYear: 1999,
    genres: ['Action', 'Adventure', 'Comedy', 'Fantasy'],
    averageScore: 88,
    malScore: 8.8,
    aniListScore: 88,
    popularity: 200000
  },
  {
    id: 142329,
    idMal: 5114,
    title: { english: 'Demon Slayer: Kimetsu no Yaiba', romaji: 'Kimetsu no Yaiba', native: '鬼滅の刃' },
    coverImage: { extraLarge: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80', large: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80' },
    bannerImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
    description: 'Tanjiro Kamado sets out to become a demon slayer to turn his demonized sister Nezuko back into a human.',
    format: 'TV',
    episodes: 26,
    duration: 24,
    status: 'FINISHED',
    seasonYear: 2019,
    genres: ['Action', 'Supernatural'],
    averageScore: 86,
    malScore: 8.6,
    aniListScore: 86,
    popularity: 180000
  },
  {
    id: 113415,
    idMal: 40748,
    title: { english: 'Jujutsu Kaisen', romaji: 'Jujutsu Kaisen', native: '呪術廻戦' },
    coverImage: { extraLarge: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80', large: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80' },
    bannerImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80',
    description: 'A boy swallows a cursed talisman—the finger of a demon—and becomes cursed himself.',
    format: 'TV',
    episodes: 24,
    duration: 24,
    status: 'FINISHED',
    seasonYear: 2020,
    genres: ['Action', 'Supernatural'],
    averageScore: 87,
    malScore: 8.7,
    aniListScore: 87,
    popularity: 170000
  },
  {
    id: 154587,
    idMal: 52991,
    title: { english: 'Frieren: Beyond Journey\'s End', romaji: 'Sousou no Frieren', native: '葬送のフリーレン' },
    coverImage: { extraLarge: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', large: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80' },
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    description: 'An elven mage reflects on life and mortality after defeating the Demon King alongside her hero companions.',
    format: 'TV',
    episodes: 28,
    duration: 24,
    status: 'FINISHED',
    seasonYear: 2023,
    genres: ['Adventure', 'Drama', 'Fantasy'],
    averageScore: 93,
    malScore: 9.3,
    aniListScore: 93,
    popularity: 160000
  },
  {
    id: 127230,
    idMal: 44511,
    title: { english: 'Chainsaw Man', romaji: 'Chainsaw Man', native: 'チェンソーマン' },
    coverImage: { extraLarge: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80', large: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80' },
    bannerImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
    description: 'Denji merges with his pet devil Pochita to become Chainsaw Man and joins Devil Hunters.',
    format: 'TV',
    episodes: 12,
    duration: 24,
    status: 'FINISHED',
    seasonYear: 2022,
    genres: ['Action', 'Supernatural'],
    averageScore: 85,
    malScore: 8.5,
    aniListScore: 85,
    popularity: 140000
  }
];

registerTitlesInDictionary(FALLBACK_ANIME_DATA);

async function fetchAniList<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const cacheKey = JSON.stringify({ query, variables });
  const cached = getCachedData<T>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'AniList API Error');
    }

    setCachedData(cacheKey, json.data);
    return json.data as T;
  } catch (error) {
    console.warn('AniList query failed:', error);
    throw error;
  }
}

async function fetchJikan<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  const queryStr = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== 'All' && v !== '')
  ).toString();

  const url = `${JIKAN_BASE_URL}${endpoint}${queryStr ? `?${queryStr}` : ''}`;
  const cached = getCachedData<T>(url);
  if (cached) return cached;

  try {
    const response = await fetch(url);
    const json = await response.json();
    setCachedData(url, json);
    return json as T;
  } catch (err) {
    console.error('Jikan Fetch Error:', err);
    throw err;
  }
}

function mapJikanToMedia(malItem: any): AnimeMedia {
  if (!malItem) return FALLBACK_ANIME_DATA[0];
  const genres = malItem.genres ? malItem.genres.map((g: any) => g.name) : ['Action'];
  const coverLarge = malItem.images?.jpg?.large_image_url || malItem.images?.jpg?.image_url;
  const score = malItem.score ? Math.round(malItem.score * 10) : 85;

  return {
    id: malItem.mal_id,
    idMal: malItem.mal_id,
    title: {
      romaji: malItem.title || 'Anime',
      english: malItem.title_english || malItem.title || 'Anime',
      native: malItem.title_japanese || malItem.title || 'Anime',
    },
    coverImage: {
      extraLarge: coverLarge,
      large: coverLarge,
      medium: malItem.images?.jpg?.image_url,
    },
    bannerImage: malItem.trailer?.images?.maximum_image_url || coverLarge,
    description: malItem.synopsis || 'No description available.',
    format: malItem.type || 'TV',
    episodes: malItem.episodes || 12,
    duration: 24,
    status: malItem.status === 'Currently Airing' ? 'RELEASING' : 'FINISHED',
    seasonYear: malItem.year || 2024,
    genres,
    averageScore: score,
    malScore: malItem.score || 8.5,
    aniListScore: score,
    popularity: malItem.popularity || 1000,
    studios: { nodes: [] },
    recommendations: { nodes: [] }
  };
}

const MEDIA_FRAGMENT = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  description
  format
  episodes
  duration
  status
  seasonYear
  season
  genres
  averageScore
  popularity
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
`;

export async function getTrendingAnime(page = 1, perPage = 12): Promise<AnimeMedia[]> {
  try {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          media (type: ANIME, sort: TRENDING_DESC) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const data = await fetchAniList<{ Page: { media: AnimeMedia[] } }>(query, { page, perPage });
    registerTitlesInDictionary(data.Page.media);
    return data.Page.media;
  } catch (e) {
    try {
      const jikanData = await fetchJikan<any>('/top/anime', { filter: 'bypopularity', page, limit: perPage });
      const mediaList = (jikanData.data || []).map(mapJikanToMedia);
      registerTitlesInDictionary(mediaList);
      return mediaList;
    } catch (err) {
      return FALLBACK_ANIME_DATA;
    }
  }
}

export async function getPopularAnime(page = 1, perPage = 12): Promise<AnimeMedia[]> {
  try {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          media (type: ANIME, sort: POPULARITY_DESC) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const data = await fetchAniList<{ Page: { media: AnimeMedia[] } }>(query, { page, perPage });
    registerTitlesInDictionary(data.Page.media);
    return data.Page.media;
  } catch (e) {
    try {
      const jikanData = await fetchJikan<any>('/top/anime', { filter: 'bypopularity', page, limit: perPage });
      const mediaList = (jikanData.data || []).map(mapJikanToMedia);
      registerTitlesInDictionary(mediaList);
      return mediaList;
    } catch (err) {
      return FALLBACK_ANIME_DATA;
    }
  }
}

export async function getTopRatedAnime(page = 1, perPage = 12): Promise<AnimeMedia[]> {
  try {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          media (type: ANIME, sort: SCORE_DESC) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const data = await fetchAniList<{ Page: { media: AnimeMedia[] } }>(query, { page, perPage });
    registerTitlesInDictionary(data.Page.media);
    return data.Page.media;
  } catch (e) {
    try {
      const jikanData = await fetchJikan<any>('/top/anime', { filter: 'favorite', page, limit: perPage });
      const mediaList = (jikanData.data || []).map(mapJikanToMedia);
      registerTitlesInDictionary(mediaList);
      return mediaList;
    } catch (err) {
      return FALLBACK_ANIME_DATA;
    }
  }
}

export async function getCurrentlyAiringAnime(page = 1, perPage = 12): Promise<AnimeMedia[]> {
  try {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          media (type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const data = await fetchAniList<{ Page: { media: AnimeMedia[] } }>(query, { page, perPage });
    registerTitlesInDictionary(data.Page.media);
    return data.Page.media;
  } catch (e) {
    try {
      const jikanData = await fetchJikan<any>('/top/anime', { filter: 'airing', page, limit: perPage });
      const mediaList = (jikanData.data || []).map(mapJikanToMedia);
      registerTitlesInDictionary(mediaList);
      return mediaList;
    } catch (err) {
      return FALLBACK_ANIME_DATA;
    }
  }
}

export interface SearchOptions {
  search?: string;
  genre?: string;
  year?: number;
  format?: string;
  status?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

// Helper to execute AniList GraphQL search
async function executeAniListSearchQuery(
  searchTerm: string | undefined,
  genre?: string,
  year?: number,
  format?: string,
  status?: string,
  sort = 'POPULARITY_DESC',
  page = 1,
  perPage = 24
): Promise<AniListPageResponse> {
  const query = `
    query ($page: Int, $perPage: Int, $search: String, $genre: String, $seasonYear: Int, $format: MediaFormat, $status: MediaStatus, $sort: [MediaSort]) {
      Page (page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          hasNextPage
        }
        media (type: ANIME, search: $search, genre: $genre, seasonYear: $seasonYear, format: $format, status: $status, sort: $sort) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;

  const variables: Record<string, any> = { page, perPage, sort: [sort] };
  if (searchTerm && searchTerm.trim() !== '') variables.search = searchTerm.trim();
  if (genre && genre !== 'All') variables.genre = genre;
  if (year) variables.seasonYear = year;
  if (format && format !== 'All') variables.format = format;
  if (status && status !== 'All') variables.status = status;

  const data = await fetchAniList<{ Page: AniListPageResponse }>(query, variables);
  registerTitlesInDictionary(data.Page.media);
  return data.Page;
}

/**
 * Intelligent Typo-Tolerant Search Engine
 * Automatically checks for spelling mistakes and corrects search queries.
 */
export async function searchAnime(options: SearchOptions = {}): Promise<AniListPageResponse> {
  const { search, genre, year, format, status, sort = 'POPULARITY_DESC', page = 1, perPage = 24 } = options;

  if (!search || search.trim() === '') {
    try {
      return await executeAniListSearchQuery(undefined, genre, year, format, status, sort, page, perPage);
    } catch (err) {
      return {
        pageInfo: { total: FALLBACK_ANIME_DATA.length, currentPage: 1, hasNextPage: false },
        media: FALLBACK_ANIME_DATA
      };
    }
  }

  const rawSearch = search.trim();
  const typoResult = findTypoCorrection(rawSearch, Array.from(dynamicTitleDictionary));

  try {
    // 1. First execution: Try exact search term against AniList
    const primaryData = await executeAniListSearchQuery(rawSearch, genre, year, format, status, sort, page, perPage);

    // If AniList returned results
    if (primaryData.media && primaryData.media.length > 0) {
      // Check if primary results already match well
      const topMatch = primaryData.media[0];
      const topTitleEng = topMatch.title?.english || topMatch.title?.romaji || '';
      
      // If we identified a potential typo and the suggested query is very relevant
      if (typoResult.hasTypo && typoResult.suggestedQuery && 
          !topTitleEng.toLowerCase().includes(rawSearch.toLowerCase())) {
        return {
          ...primaryData,
          didYouMean: typoResult.suggestedQuery,
          originalQuery: rawSearch
        };
      }
      return primaryData;
    }

    // 2. If primary query returned 0 results AND we have a typo suggestion (e.g., "Nartuo" -> "Naruto")
    if ((!primaryData.media || primaryData.media.length === 0) && typoResult.suggestedQuery) {
      console.log(`[TypoCorrection] 0 results for '${rawSearch}'. Auto-correcting to '${typoResult.suggestedQuery}'`);
      
      const correctedData = await executeAniListSearchQuery(typoResult.suggestedQuery, genre, year, format, status, sort, page, perPage);
      
      if (correctedData.media && correctedData.media.length > 0) {
        return {
          ...correctedData,
          correctedQuery: typoResult.suggestedQuery,
          originalQuery: rawSearch
        };
      }
    }

    return primaryData;
  } catch (e) {
    // Fallback search with local fuzzy matching
    console.warn('[Search] Primary API failed, executing fallback fuzzy search:', e);
    const targetSearch = typoResult.suggestedQuery || rawSearch;
    const normTarget = normalizeTitle(targetSearch);
    const normRaw = normalizeTitle(rawSearch);

    const filtered = FALLBACK_ANIME_DATA.filter(item => {
      const eng = normalizeTitle(item.title.english || '');
      const rom = normalizeTitle(item.title.romaji || '');
      return eng.includes(normTarget) || rom.includes(normTarget) ||
             eng.includes(normRaw) || rom.includes(normRaw) ||
             calculateSimilarity(rawSearch, eng) > 0.6 ||
             calculateSimilarity(rawSearch, rom) > 0.6;
    });

    const resultsMedia = filtered.length > 0 ? filtered : FALLBACK_ANIME_DATA;

    return {
      pageInfo: { total: resultsMedia.length, currentPage: 1, hasNextPage: false },
      media: resultsMedia,
      correctedQuery: typoResult.suggestedQuery || undefined,
      originalQuery: rawSearch
    };
  }
}

export async function getAnimeDetails(id: number): Promise<AnimeMedia> {
  try {
    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          ${MEDIA_FRAGMENT}
          startDate { year month day }
          endDate { year month day }
          streamingEpisodes { title thumbnail url site }
          studios (isMain: true) { nodes { id name } }
          characters (sort: [ROLE, RELEVANCE], perPage: 8) {
            edges { role node { id name { full } image { medium } } }
          }
          recommendations (perPage: 6) {
            nodes { mediaRecommendation { ${MEDIA_FRAGMENT} } }
          }
        }
      }
    `;
    const data = await fetchAniList<{ Media: AnimeMedia }>(query, { id });
    return data.Media;
  } catch (e) {
    const matched = FALLBACK_ANIME_DATA.find(item => item.id === id || item.idMal === id);
    return matched || FALLBACK_ANIME_DATA[0];
  }
}

export interface AiringScheduleItem {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
  media: AnimeMedia;
}

/**
 * Fetch Comprehensive Airing Release Schedule across previous, current, and upcoming days
 */
export async function getAiringSchedule(startOfWeekTimestamp: number, endOfWeekTimestamp: number): Promise<AiringScheduleItem[]> {
  try {
    const query = `
      query ($airingAt_greater: Int, $airingAt_lesser: Int, $page: Int) {
        Page (page: $page, perPage: 50) {
          airingSchedules (airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
            id
            airingAt
            timeUntilAiring
            episode
            media {
              ${MEDIA_FRAGMENT}
            }
          }
        }
      }
    `;

    // Multi-page fetch to get complete 100+ anime release schedule across past and future days
    const [p1, p2] = await Promise.all([
      fetchAniList<{ Page: { airingSchedules: AiringScheduleItem[] } }>(query, {
        airingAt_greater: startOfWeekTimestamp,
        airingAt_lesser: endOfWeekTimestamp,
        page: 1
      }),
      fetchAniList<{ Page: { airingSchedules: AiringScheduleItem[] } }>(query, {
        airingAt_greater: startOfWeekTimestamp,
        airingAt_lesser: endOfWeekTimestamp,
        page: 2
      }).catch(() => ({ Page: { airingSchedules: [] } }))
    ]);

    const combined = [
      ...(p1.Page?.airingSchedules || []),
      ...(p2.Page?.airingSchedules || [])
    ];

    const map = new Map<number, AiringScheduleItem>();
    combined.forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });

    const list = Array.from(map.values());
    list.sort((a, b) => a.airingAt - b.airingAt);

    if (list.length > 0) return list;
    throw new Error('Empty schedule response');
  } catch (e) {
    console.warn('Airing schedule query notice, generating rich fallback dataset across all 7 days:', e);

    const nowSecs = Math.floor(Date.now() / 1000);
    const daySecs = 86400;

    return FALLBACK_ANIME_DATA.flatMap((media, idx) => {
      // Map across past 3 days, today, and next 3 days to guarantee all days have releases
      return [-3, -2, -1, 0, 1, 2, 3].map(dayOffset => {
        const timestamp = nowSecs + (dayOffset * daySecs) + (idx * 3600 + 7200);
        return {
          id: media.id * 100 + Math.abs(dayOffset * 10) + idx,
          airingAt: timestamp,
          timeUntilAiring: timestamp - nowSecs,
          episode: Math.max(1, (media.episodes || 12) - Math.abs(dayOffset)),
          media
        };
      });
    });
  }
}

export const ANIME_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];
