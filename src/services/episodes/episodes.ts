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
}

const MAL_EPISODE_CACHE = new Map<number, NormalizedEpisode[]>();

// Known total episode counts for ongoing or long-running series
const KNOWN_EPISODE_COUNTS: Record<number, number> = {
  21: 1125,    // One Piece
  20: 220,     // Naruto
  1735: 500,   // Naruto Shippuden
  269: 366,    // Bleach
  97940: 170,  // Black Clover
  235: 291,    // Dragon Ball Z
  105333: 170, // Dr. Stone
  21519: 500,  // Boruto
  237: 1120,   // Detective Conan
  21087: 175,  // Fairy Tail
};

/**
 * Anikoto-Style Paginated Episode Fetcher:
 * Automatically iterates through upstream Jikan API pagination (page=1, page=2, page=3...)
 * to retrieve ALL available episode titles and metadata without stopping at 100.
 */
async function fetchAllMalEpisodes(targetId: number): Promise<Map<number, any>> {
  const malEpMap = new Map<number, any>();
  let page = 1;
  const maxPages = 15; // Cap at 1500 episodes to prevent infinite loops

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
      // Respect Jikan rate limits (3 requests per second)
      await new Promise((resolve) => setTimeout(resolve, 350));
    } catch (err) {
      console.warn(`[Episode Layer] Jikan page ${page} fetch notice:`, err);
      break;
    }
  }

  return malEpMap;
}

/**
 * Complete Episode List Resolver:
 * Dynamically resolves full episode count and thumbnails for 10, 100, 500, 1000, 2000+ episode series.
 */
export async function getNormalizedEpisodes(
  animeId: number,
  totalEpisodes?: number | null,
  malId?: number,
  streamingEpisodes?: Array<{ title?: string; thumbnail?: string; url?: string }>
): Promise<NormalizedEpisode[]> {
  const targetId = malId || animeId;

  if (MAL_EPISODE_CACHE.has(targetId)) {
    return MAL_EPISODE_CACHE.get(targetId)!;
  }

  // Map AniList streaming episode thumbnails
  const streamingThumbnailMap = new Map<number, string>();
  if (streamingEpisodes && streamingEpisodes.length > 0) {
    streamingEpisodes.forEach((se, idx) => {
      if (se.thumbnail) {
        streamingThumbnailMap.set(idx + 1, se.thumbnail);
      }
    });
  }

  // Resolve total episode count
  const knownCount = KNOWN_EPISODE_COUNTS[animeId] || (malId ? KNOWN_EPISODE_COUNTS[malId] : undefined);
  const epCount = knownCount || (totalEpisodes && totalEpisodes > 0 ? totalEpisodes : 24);

  const episodes: NormalizedEpisode[] = [];

  try {
    const malEpMap = await fetchAllMalEpisodes(targetId);

    // Generate complete episode list 1..epCount
    for (let i = 1; i <= epCount; i++) {
      const malItem = malEpMap.get(i);
      const thumb = streamingThumbnailMap.get(i);
      episodes.push({
        number: i,
        title: malItem?.title || malItem?.title_romanji || `Episode ${i}`,
        airDate: malItem?.aired ? new Date(malItem.aired).toLocaleDateString() : undefined,
        duration: 24,
        malId: malItem?.mal_id,
        isFiller: Boolean(malItem?.filler),
        isRecap: Boolean(malItem?.recap),
        subAvailable: true,
        dubAvailable: true,
        playable: true,
        thumbnail: thumb,
      });
    }
  } catch (err) {
    console.warn('MAL Episode fetch fallback:', err);
  }

  // Fallback if MAL query fails
  if (episodes.length === 0) {
    for (let i = 1; i <= epCount; i++) {
      const thumb = streamingThumbnailMap.get(i);
      episodes.push({
        number: i,
        title: `Episode ${i}`,
        subAvailable: true,
        dubAvailable: true,
        playable: true,
        thumbnail: thumb,
      });
    }
  }

  MAL_EPISODE_CACHE.set(targetId, episodes);
  return episodes;
}

/**
 * Server-Side Episode Pagination Endpoint Handler:
 * Returns paginated slice of episodes for frontend rendering without loading thousands of DOM nodes at once.
 */
export async function getPaginatedEpisodes(
  animeId: number,
  page: number = 1,
  pageSize: number = 100,
  totalEpisodes?: number | null,
  malId?: number,
  streamingEpisodes?: Array<{ title?: string; thumbnail?: string; url?: string }>
): Promise<PaginatedEpisodesResponse> {
  const allEpisodes = await getNormalizedEpisodes(animeId, totalEpisodes, malId, streamingEpisodes);

  const total = allEpisodes.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.ceil(total / safePageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const startIndex = (currentPage - 1) * safePageSize;
  const paginatedSlice = allEpisodes.slice(startIndex, startIndex + safePageSize);

  return {
    episodes: paginatedSlice,
    pagination: {
      page: currentPage,
      pageSize: safePageSize,
      total,
      hasNextPage: currentPage < totalPages,
      totalPages,
    },
  };
}
