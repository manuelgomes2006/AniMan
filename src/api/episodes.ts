import { getPaginatedEpisodes, getNormalizedEpisodes, PaginatedEpisodesResponse, NormalizedEpisode } from '../services/episodes/episodes';

/**
 * Server-Side Episode API Handler (/api/anime/:id/episodes)
 * Supports page-based episode pagination (page=1, pageSize=100) and complete episode list retrieval.
 */
export async function getAnimeEpisodesHandler(
  animeId: number,
  page: number = 1,
  pageSize: number = 100,
  totalEpisodes?: number | null,
  malId?: number,
  streamingEpisodes?: Array<{ title?: string; thumbnail?: string; url?: string }>
): Promise<PaginatedEpisodesResponse> {
  return getPaginatedEpisodes(animeId, page, pageSize, totalEpisodes, malId, streamingEpisodes);
}

/**
 * Server-Side Episode Details Endpoint (/api/episodes/:episodeId)
 */
export async function getSingleEpisodeHandler(
  animeId: number,
  episodeNumber: number,
  totalEpisodes?: number | null,
  malId?: number
): Promise<NormalizedEpisode | null> {
  const allEpisodes = await getNormalizedEpisodes(animeId, totalEpisodes, malId);
  return allEpisodes.find((ep) => ep.number === episodeNumber) || null;
}
