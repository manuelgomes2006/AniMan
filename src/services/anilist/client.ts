import { AnimeMedia, AniListPageResponse } from '../../types/anime';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

// Primary High-Speed AniList GraphQL Client
async function fetchAniList<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const cacheKey = JSON.stringify({ query, variables });
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

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
      console.error('AniList API Error:', json.errors);
      throw new Error(json.errors[0]?.message || 'AniList API Error');
    }

    cache.set(cacheKey, { data: json.data, timestamp: Date.now() });
    return json.data as T;
  } catch (error) {
    console.warn('AniList failed, trying MyAnimeList fallback...', error);
    throw error;
  }
}

// Dual MyAnimeList Jikan v4 Client
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
    const json = await response.json();
    cache.set(url, { data: json, timestamp: Date.now() });
    return json as T;
  } catch (err) {
    console.error('Jikan Fetch Error:', err);
    throw err;
  }
}

function mapJikanToMedia(malItem: any): AnimeMedia {
  if (!malItem) return {} as AnimeMedia;
  const genres = malItem.genres ? malItem.genres.map((g: any) => g.name) : ['Action'];
  const studios = malItem.studios ? malItem.studios.map((s: any) => ({ id: s.mal_id, name: s.name })) : [];
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
    studios: { nodes: studios },
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
    return data.Page.media.map(m => ({ ...m, aniListScore: m.averageScore, malScore: m.averageScore ? m.averageScore / 10 : 8.5 }));
  } catch (e) {
    const jikanData = await fetchJikan<any>('/top/anime', { filter: 'bypopularity', page, limit: perPage });
    return (jikanData.data || []).map(mapJikanToMedia);
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
    return data.Page.media.map(m => ({ ...m, aniListScore: m.averageScore, malScore: m.averageScore ? m.averageScore / 10 : 8.5 }));
  } catch (e) {
    const jikanData = await fetchJikan<any>('/top/anime', { filter: 'bypopularity', page, limit: perPage });
    return (jikanData.data || []).map(mapJikanToMedia);
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
    return data.Page.media.map(m => ({ ...m, aniListScore: m.averageScore, malScore: m.averageScore ? m.averageScore / 10 : 8.5 }));
  } catch (e) {
    const jikanData = await fetchJikan<any>('/top/anime', { filter: 'favorite', page, limit: perPage });
    return (jikanData.data || []).map(mapJikanToMedia);
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
    return data.Page.media.map(m => ({ ...m, aniListScore: m.averageScore, malScore: m.averageScore ? m.averageScore / 10 : 8.5 }));
  } catch (e) {
    const jikanData = await fetchJikan<any>('/top/anime', { filter: 'airing', page, limit: perPage });
    return (jikanData.data || []).map(mapJikanToMedia);
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

export async function searchAnime(options: SearchOptions = {}): Promise<AniListPageResponse> {
  const {
    search,
    genre,
    year,
    format,
    status,
    sort = 'POPULARITY_DESC',
    page = 1,
    perPage = 24,
  } = options;

  try {
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
    if (search && search.trim() !== '') variables.search = search.trim();
    if (genre && genre !== 'All') variables.genre = genre;
    if (year) variables.seasonYear = year;
    if (format && format !== 'All') variables.format = format;
    if (status && status !== 'All') variables.status = status;

    const data = await fetchAniList<{ Page: AniListPageResponse }>(query, variables);
    return data.Page;
  } catch (e) {
    const jikanData = await fetchJikan<any>('/anime', { q: search, page, limit: perPage });
    const mapped = (jikanData.data || []).map(mapJikanToMedia);
    return {
      pageInfo: { total: mapped.length, currentPage: page, hasNextPage: false },
      media: mapped
    };
  }
}

export async function getAnimeDetails(id: number): Promise<AnimeMedia> {
  try {
    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          ${MEDIA_FRAGMENT}
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          streamingEpisodes {
            title
            thumbnail
            url
            site
          }
          studios (isMain: true) {
            nodes {
              id
              name
            }
          }
          characters (sort: [ROLE, RELEVANCE], perPage: 8) {
            edges {
              role
              node {
                id
                name {
                  full
                }
                image {
                  medium
                }
              }
            }
          }
          recommendations (perPage: 6) {
            nodes {
              mediaRecommendation {
                ${MEDIA_FRAGMENT}
              }
            }
          }
        }
      }
    `;
    const data = await fetchAniList<{ Media: AnimeMedia }>(query, { id: typeof id === 'string' ? parseInt(id, 10) : id });
    const media = data.Media;
    return {
      ...media,
      aniListScore: media.averageScore,
      malScore: media.averageScore ? Math.round((media.averageScore / 10) * 10) / 10 : 8.5
    };
  } catch (e) {
    const jikanData = await fetchJikan<any>(`/anime/${id}/full`);
    return mapJikanToMedia(jikanData.data);
  }
}

export interface AiringScheduleItem {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
  media: AnimeMedia;
}

export async function getAiringSchedule(startOfWeekTimestamp: number, endOfWeekTimestamp: number): Promise<AiringScheduleItem[]> {
  try {
    const query = `
      query ($airingAt_greater: Int, $airingAt_lesser: Int) {
        Page (page: 1, perPage: 50) {
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
    const data = await fetchAniList<{ Page: { airingSchedules: AiringScheduleItem[] } }>(query, {
      airingAt_greater: startOfWeekTimestamp,
      airingAt_lesser: endOfWeekTimestamp
    });
    return data.Page.airingSchedules || [];
  } catch (e) {
    return [];
  }
}

export const ANIME_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];
