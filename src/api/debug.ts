import { EpisodeDebugResponse } from '../services/streaming/providerTypes';
import { VIDEO_PROVIDERS } from '../services/streaming/providerRegistry';

/**
 * Server-Side Development Debug Endpoint Handler (/api/debug/episode/:episodeId)
 * Provides detailed diagnostic logs without exposing secret API keys or credentials.
 */
export async function getEpisodeDebugHandler(
  animeId: number,
  episodeNumber: number
): Promise<EpisodeDebugResponse> {
  const episodeId = `${animeId}-${episodeNumber}`;

  const providerResolution = VIDEO_PROVIDERS.map((prov) => ({
    provider: prov.name,
    status: prov.enabled && prov.status === 'available' ? ('success' as const) : ('failed' as const),
    reason: prov.status !== 'available' ? `PROVIDER_${prov.status.toUpperCase()}` : undefined,
    urlType: 'iframe',
  }));

  return {
    episodeId,
    catalogSource: `AniList Media #${animeId}`,
    providerResolution,
  };
}
