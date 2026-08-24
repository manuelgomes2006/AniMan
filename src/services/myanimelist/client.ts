import { AnimeMedia, AniListPageResponse } from '../../types/anime';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

async function fetchJikan<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  const queryStr = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== 'All' && v !== '')
  ).toString();

  const url = `${JIKAN_BASE_URL}${endpoint}${queryStr ? `?${queryStr}` : ''}`;
  const cached = cache.get(url);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit fallback wait
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchJikan<T>(endpoint, params);
      }
      throw new Error(`MyAnimeList Jikan API error: ${response.statusText}`);
    }

    const json = await response.json();
    cache.set(url, { data: json, timestamp: Date.now() });
    return json as T;
  } catch (error) {
    console.error('MyAnimeList Client Error:', error);
    throw error;
  }
}

// Map Jikan MAL object -> AnimeMedia interface for 100% UI component compatibility
function mapJikanToMedia(malItem: any): AnimeMedia {
  if (!malItem) return {} as AnimeMedia;

  const genres = malItem.genres ? malItem.genres.map((g: any) => g.name) : [];
  const studios = malItem.studios ? malItem.studios.map((s: any) => ({ id: s.mal_id, name: s.name })) : [];

  let status = 'FINISHED';
  if (malItem.status === 'Currently Airing') status = 'RELEASING';
  if (malItem.status === 'Not yet aired') status = 'NOT_YET_RELEASED';

  const coverLarge = malItem.images?.jpg?.large_image_url || malItem.images?.jpg?.image_url;
  const coverMedium = malItem.images?.jpg?.image_url || malItem.images?.jpg?.small_image_url;
  const banner = malItem.trailer?.images?.maximum_image_url || malItem.images?.jpg?.large_image_url;

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
      medium: coverMedium,
    },
    bannerImage: banner,
    description: malItem.synopsis || 'No description available.',
    format: malItem.type || 'TV',
    episodes: malItem.episodes || 12,
    duration: malItem.duration ? parseInt(malItem.duration, 10) || 24 : 24,
    status,
    seasonYear: malItem.year || (malItem.aired?.from ? new Date(malItem.aired.from).getFullYear() : 2024),
    season: malItem.season,
    genres,
    averageScore: malItem.score ? Math.round(malItem.score * 10) : 85,
    popularity: malItem.popularity || 1000,
    studios: {
      nodes: studios,
    },
    recommendations: {
      nodes: [],
    },
  };
}

export async function getTrendingAnime(page = 1, perPage = 10): Promise<AnimeMedia[]> {
  const data = await fetchJikan<any>('/top/anime', { filter: 'bypopularity', page, limit: perPage });
  return (data.data || []).map(mapJikanToMedia);
}

export async function getPopularAnime(page = 1, perPage = 12): Promise<AnimeMedia[]> {
  const data = await fetchJikan<any>('/top/anime', { filter: 'bypopularity', page, limit: perPage });
  return (data.data || []).map(mapJikanToMedia);
}

export async function getTopRatedAnime(page = 1, perPage = 12): Promise<AnimeMedia[]> {
  const data = await fetchJikan<any>('/top/anime', { filter: 'favorite', page, limit: perPage });
  return (data.data || []).map(mapJikanToMedia);
}

export async function getCurrentlyAiringAnime(page = 1, perPage = 12): Promise<AnimeMedia[]> {
  const data = await fetchJikan<any>('/top/anime', { filter: 'airing', page, limit: perPage });
  return (data.data || []).map(mapJikanToMedia);
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

export async function searchAnime(options: SearchOptions = {}): Promise<AniListPageResponse> {
  const { search, page = 1, perPage = 24 } = options;
  const data = await fetchJikan<any>('/anime', { q: search, page, limit: perPage, sfw: true });

  const mapped = (data.data || []).map(mapJikanToMedia);
  return {
    pageInfo: {
      total: data.pagination?.items?.total || mapped.length,
      currentPage: page,
      hasNextPage: Boolean(data.pagination?.has_next_page),
    },
    media: mapped,
  };
}

export async function getAnimeDetails(id: number): Promise<AnimeMedia> {
  const data = await fetchJikan<any>(`/anime/${id}/full`);
  const media = mapJikanToMedia(data.data);

  // Fetch recommendations from MyAnimeList Jikan endpoint
  try {
    const recData = await fetchJikan<any>(`/anime/${id}/recommendations`);
    if (recData.data && recData.data.length > 0) {
      media.recommendations = {
        nodes: recData.data.slice(0, 6).map((r: any) => ({
          mediaRecommendation: mapJikanToMedia(r.entry),
        })),
      };
    }
  } catch (e) {
    // Graceful recommendation fallback
  }

  return media;
}

export interface AiringScheduleItem {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
  media: AnimeMedia;
}

export async function getAiringSchedule(startOfWeekTimestamp: number, endOfWeekTimestamp: number): Promise<AiringScheduleItem[]> {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDay = days[new Date().getDay()];

  try {
    const data = await fetchJikan<any>(`/schedules`, { filter: todayDay });
    const items = (data.data || []).map((malItem: any, idx: number) => ({
      id: malItem.mal_id,
      airingAt: Math.floor(Date.now() / 1000) + idx * 3600,
      timeUntilAiring: idx * 3600,
      episode: malItem.episodes || 1,
      media: mapJikanToMedia(malItem),
    }));
    return items;
  } catch (e) {
    return [];
  }
}

export const ANIME_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];
