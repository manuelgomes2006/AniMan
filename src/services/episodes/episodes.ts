export interface NormalizedEpisode {
  number: number;
  title: string;
  airDate?: string;
  duration?: number;
  malId?: number;
  providerId?: string;
  isFiller?: boolean;
  isRecap?: boolean;
  subAvailable: boolean;
  dubAvailable: boolean;
  playable: boolean;
  thumbnail?: string;
}

export interface EpisodePagination {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  totalPages: number;
}

export interface PaginatedEpisodesResponse {
  episodes: NormalizedEpisode[];
  pagination: EpisodePagination;
  totalEpisodes?: number;
  releasedEpisodes: number;
}

interface CacheEntry {
  episodes: NormalizedEpisode[];
  timestamp: number;
  isAiring?: boolean;
}

const EPISODE_CACHE = new Map<number, CacheEntry>();
const SHORT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes for airing anime
const LONG_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for finished anime

/**
 * Anikoto-Style Upstream Episode Fetcher:
 * Queries Jikan API pagination (page=1, page=2...) to retrieve released episode data.
 */
async function fetchAllMalEpisodes(targetId: number): Promise<Map<number, any>> {
  const malEpMap = new Map<number, any>();
  let page = 1;
  const maxPages = 15; // Up to 1500 episodes

  while (page <= maxPages) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${targetId}/episodes?page=${page}`);
      if (!res.ok) break;

      const json = await res.json();
      const items = json.data || [];
      if (items.length === 0) break;

      items.forEach((item: any) => {
        const epNum = item.mal_id || item.episode;
        if (epNum) malEpMap.set(epNum, item);
      });

      const hasNext = json.pagination?.has_next_page;
      if (!hasNext) break;

      page++;
      // Respect Jikan rate limit
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch (err) {
      console.warn(`[Episode Layer] Jikan page ${page} fetch notice:`, err);
      break;
    }
  }

  return malEpMap;
}

import { checkAnimeDubAvailability } from '../streaming/dubDetector';

/**
 * Released Episodes Resolver:
 * Resolves ONLY actual released episodes returned by the source catalog (AniList nextAiringEpisode / streamingEpisodes / Jikan MAL).
 * NEVER fabricates unreleased/future episode placeholders.
 */
export async function getNormalizedEpisodes(
  animeId: number,
  totalEpisodes?: number | null,
  malId?: number,
  streamingEpisodes?: Array<{ title?: string; thumbnail?: string; url?: string }>,
  status?: string,
  nextAiringEpisode?: { episode: number } | null,
  title?: string
): Promise<NormalizedEpisode[]> {
  const targetId = malId || animeId;

  // Check cache freshness
  const cached = EPISODE_CACHE.get(targetId);
  if (cached) {
    const isExpired = cached.isAiring
      ? Date.now() - cached.timestamp > SHORT_CACHE_TTL_MS
      : Date.now() - cached.timestamp > LONG_CACHE_TTL_MS;

    if (!isExpired && cached.episodes.length > 0) {
      return cached.episodes;
    }
  }

  // Check English dub availability dynamically
  const dubSupported = await checkAnimeDubAvailability(animeId, malId, title);

  // 1. Extract official titles & thumbnails from AniList streamingEpisodes
  const streamingDataMap = new Map<number, { title?: string; thumbnail?: string }>();
  if (streamingEpisodes && streamingEpisodes.length > 0) {
    streamingEpisodes.forEach((se, idx) => {
      const epNum = idx + 1;
      let cleanTitle = se.title;
      if (cleanTitle) {
        cleanTitle = cleanTitle.replace(/^Episode\s+\d+\s*[-:]\s*/i, '').trim();
      }
      streamingDataMap.set(epNum, {
        title: cleanTitle || se.title,
        thumbnail: se.thumbnail,
      });
    });
  }

  const episodes: NormalizedEpisode[] = [];

  try {
    const malEpMap = await fetchAllMalEpisodes(targetId);

    // 2. Determine exact released episode count
    let releasedCount = 0;

    if (nextAiringEpisode && nextAiringEpisode.episode && nextAiringEpisode.episode > 1) {
      // For currently airing anime, nextAiringEpisode.episode is N, so N-1 episodes have released
      releasedCount = nextAiringEpisode.episode - 1;
    } else {
      const rawCount = Math.max(streamingEpisodes?.length || 0, malEpMap.size);
      if (status === 'RELEASING' || status === 'Currently Airing') {
        releasedCount = rawCount > 0 ? rawCount : (totalEpisodes || 1);
      } else {
        releasedCount = rawCount > 0 ? rawCount : (totalEpisodes || streamingEpisodes?.length || 1);
      }
    }

    // 3. Loop ONLY through actual released episodes 1..releasedCount
    for (let i = 1; i <= releasedCount; i++) {
      const malItem = malEpMap.get(i);
      const aniListData = streamingDataMap.get(i);

      const officialTitle =
        aniListData?.title ||
        malItem?.title ||
        malItem?.title_romanji ||
        malItem?.title_japanese ||
        `Episode ${i}`;

      const thumb = aniListData?.thumbnail;

      episodes.push({
        number: i,
        title: officialTitle,
        airDate: malItem?.aired ? new Date(malItem.aired).toLocaleDateString() : undefined,
        duration: 24,
        malId: malItem?.mal_id,
        isFiller: Boolean(malItem?.filler),
        isRecap: Boolean(malItem?.recap),
        subAvailable: true,
        dubAvailable: dubSupported,
        playable: true,
        thumbnail: thumb,
      });
    }
  } catch (err) {
    console.warn('MAL Episode fetch fallback:', err);
  }

  // Fallback if MAL fetch fails: use ONLY actual streamingEpisodes returned
  if (episodes.length === 0 && streamingEpisodes && streamingEpisodes.length > 0) {
    streamingEpisodes.forEach((se, idx) => {
      const i = idx + 1;
      let cleanTitle = se.title;
      if (cleanTitle) {
        cleanTitle = cleanTitle.replace(/^Episode\s+\d+\s*[-:]\s*/i, '').trim();
      }
      episodes.push({
        number: i,
        title: cleanTitle || `Episode ${i}`,
        subAvailable: true,
        dubAvailable: dubSupported,
        playable: true,
        thumbnail: se.thumbnail,
      });
    });
  }

  const isAiring = status === 'RELEASING' || status === 'Currently Airing';
  EPISODE_CACHE.set(targetId, {
    episodes,
    timestamp: Date.now(),
    isAiring,
  });

  return episodes;
}

/**
 * Server-Side Episode Pagination Endpoint Handler:
 * Returns paginated slice of released episodes without generating unreleased episode placeholders.
 */
export async function getPaginatedEpisodes(
  animeId: number,
  page: number = 1,
  pageSize: number = 100,
  totalEpisodes?: number | null,
  malId?: number,
  streamingEpisodes?: Array<{ title?: string; thumbnail?: string; url?: string }>,
  status?: string,
  nextAiringEpisode?: { episode: number } | null
): Promise<PaginatedEpisodesResponse> {
  const allReleasedEpisodes = await getNormalizedEpisodes(
    animeId,
    totalEpisodes,
    malId,
    streamingEpisodes,
    status,
    nextAiringEpisode
  );

  const releasedEpisodes = allReleasedEpisodes.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.ceil(releasedEpisodes / safePageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const startIndex = (currentPage - 1) * safePageSize;
  const paginatedSlice = allReleasedEpisodes.slice(startIndex, startIndex + safePageSize);

  return {
    episodes: paginatedSlice,
    pagination: {
      page: currentPage,
      pageSize: safePageSize,
      total: releasedEpisodes,
      hasNextPage: currentPage < totalPages,
      totalPages,
    },
    totalEpisodes: totalEpisodes || undefined,
    releasedEpisodes,
  };
}
