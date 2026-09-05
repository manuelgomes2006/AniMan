import { EpisodeSources, EpisodeSourceItem, AudioVariant } from '../services/streaming/providerTypes';
import { VIDEO_PROVIDERS, isAllowedEmbedUrl } from '../services/streaming/providerRegistry';
import { AniLinkProvider } from '../services/streaming/providers/anilinkProvider';
import { MegaPlayProvider } from '../services/streaming/providers/megaPlayProvider';

const PROVIDER_INSTANCES = [
  new MegaPlayProvider(),
  new AniLinkProvider(),
];

/**
 * Secure Server-Side Episode Sources Handler Endpoint (/api/episodes/:id/sources)
 * Resolves active authorized providers (MegaPlay HD) and validates URLs strictly.
 */
export async function getEpisodeSourcesHandler(
  animeId: number,
  episodeNumber: number,
  variant: AudioVariant = 'sub',
  title: string = 'Anime',
  malId?: number
): Promise<EpisodeSources> {
  const sources: EpisodeSourceItem[] = [];

  for (const config of VIDEO_PROVIDERS) {
    if (!config.enabled || config.status !== 'available') continue;

    const provider = PROVIDER_INSTANCES.find((p) => p.id === config.id);
    if (!provider) continue;

    try {
      const isAvail = await provider.isAvailable();
      if (!isAvail) continue;

      const embedUrl = await provider.getEmbedUrl(animeId, title, episodeNumber, variant, malId);

      if (embedUrl && isAllowedEmbedUrl(embedUrl, config.id)) {
        sources.push({
          episodeId: `${animeId}-${episodeNumber}`,
          provider: config.id,
          providerName: config.name,
          language: variant,
          type: 'iframe',
          url: embedUrl,
          quality: '1080p',
          isVerified: config.verified,
          status: config.status,
        });
      }
    } catch (err) {
      console.warn(`[Sources Endpoint] Provider ${config.name} notice:`, err);
    }
  }

  return {
    episodeId: `${animeId}-${episodeNumber}`,
    animeId,
    episodeNumber,
    sources,
  };
}
