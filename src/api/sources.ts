import { EpisodeSources, EpisodeSourceItem, AudioVariant } from '../services/streaming/providerTypes';
import { VIDEO_PROVIDERS, isAllowedEmbedUrl } from '../services/streaming/providerRegistry';
import { AniLinkProvider } from '../services/streaming/providers/anilinkProvider';
import { TwoEmbedProvider } from '../services/streaming/providers/twoEmbedProvider';
import { AutoEmbedProvider } from '../services/streaming/providers/autoEmbedProvider';
import { MegaCloudProvider } from '../services/streaming/providers/megaCloudProvider';
import { VidCloudProvider } from '../services/streaming/providers/vidCloudProvider';
import { KiwiProvider } from '../services/streaming/providers/kiwiProvider';
import { VidPlayProvider } from '../services/streaming/providers/vidPlayProvider';

const PROVIDER_INSTANCES = [
  new AniLinkProvider(),
  new TwoEmbedProvider(),
  new AutoEmbedProvider(),
  new MegaCloudProvider(),
  new VidCloudProvider(),
  new KiwiProvider(),
  new VidPlayProvider(),
];

/**
 * Secure Server-Side Episode Sources Handler Endpoint (/api/episodes/:id/sources)
 * 1. Resolves ONLY verified available providers (status === 'available').
 * 2. Validates URLs strictly against domain allowlist (ALLOWED_EMBED_HOSTS).
 * 3. Never generates fake fallback URLs or claims an unverified provider works.
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
    // Only resolve providers that are explicitly enabled and verified available
    if (!config.enabled || config.status !== 'available') continue;

    const provider = PROVIDER_INSTANCES.find((p) => p.id === config.id);
    if (!provider) continue;

    try {
      const isAvail = await provider.isAvailable();
      if (!isAvail) continue;

      const embedUrl = await provider.getEmbedUrl(animeId, title, episodeNumber, variant, malId);

      if (embedUrl && isAllowedEmbedUrl(embedUrl, config.id)) {
        sources.push({
          providerId: config.id,
          providerName: config.name,
          embedUrl,
          language: variant,
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
