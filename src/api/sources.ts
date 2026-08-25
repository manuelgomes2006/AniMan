import { EpisodeSources, EpisodeSourceItem, AudioVariant } from '../services/streaming/providerTypes';

/**
 * Server-Side Episode Sources Handler Endpoint (/api/episodes/:id/sources)
 * All third-party streaming provider data has been removed.
 */
export async function getEpisodeSourcesHandler(
  animeId: number,
  episodeNumber: number,
  variant: AudioVariant = 'sub',
  title: string = 'Anime',
  malId?: number
): Promise<EpisodeSources> {
  const sources: EpisodeSourceItem[] = [];

  return {
    episodeId: `${animeId}-${episodeNumber}`,
    animeId,
    episodeNumber,
    sources,
  };
}
