import { AnimeMedia, AniListPageResponse } from '../../types/anime';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

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
      console.error('AniList API Errors:', json.errors);
      throw new Error(json.errors[0]?.message || 'Failed to fetch AniList data');
    }

    cache.set(cacheKey, { data: json.data, timestamp: Date.now() });
    return json.data as T;
  } catch (error) {
    console.error('AniList Client Fetch Error:', error);
    throw error;
  }
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

export async function getTrendingAnime(page = 1, perPage = 10): Promise<AnimeMedia[]> {
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
  return data.Page.media;
}

export async function getPopularAnime(page = 1, perPage = 12): Promise<AnimeMedia[]> {
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
  return data.Page.media;
}

export async function getTopRatedAnime(page = 1, perPage = 12): Promise<AnimeMedia[]> {
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
  return data.Page.media;
}

export async function getCurrentlyAiringAnime(page = 1, perPage = 12): Promise<AnimeMedia[]> {
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
  return data.Page.media;
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
}

export async function getAnimeDetails(id: number): Promise<AnimeMedia> {
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
  return data.Media;
}

export const ANIME_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];
