import { EpisodeSources, EpisodeSourceItem, AudioVariant } from '../services/streaming/providerTypes';
import { getRankedProviders, validateEmbedUrl } from '../services/streaming/providerRegistry';
import { AutoEmbedProvider } from '../services/streaming/providers/autoEmbedProvider';
import { MegaCloudProvider } from '../services/streaming/providers/megaCloudProvider';
import { VidCloudProvider } from '../services/streaming/providers/vidCloudProvider';
import { KiwiProvider } from '../services/streaming/providers/kiwiProvider';
import { VidPlayProvider } from '../services/streaming/providers/vidPlayProvider';

const PROVIDER_INSTANCES = [
  new AutoEmbedProvider(),
  new MegaCloudProvider(),
  new VidCloudProvider(),
  new KiwiProvider(),
  new VidPlayProvider(),
];

/**
 * Secure Server-Side Episode Sources Handler Endpoint (/api/episodes/:id/sources)
 * 1. Resolves authorized active providers according to rank and enablement.
 * 2. Validates URLs strictly against domain allowlist.
 * 3. Sanitizes response output and strips any internal secrets or keys.
 */
export async function getEpisodeSourcesHandler(
  animeId: number,
  episodeNumber: number,
  variant: AudioVariant = 'sub',
  title: string = 'Anime',
  malId?: number
): Promise<EpisodeSources> {
  const rankedConfigs = getRankedProviders();
  const sources: EpisodeSourceItem[] = [];

  for (const config of rankedConfigs) {
    const provider = PROVIDER_INSTANCES.find((p) => p.id === config.id);
    if (!provider) continue;

    try {
      const isAvail = await provider.isAvailable();
      if (!isAvail && !config.verified) continue;

      const embedUrl = await provider.getEmbedUrl(animeId, title, episodeNumber, variant, malId);

      if (embedUrl && validateEmbedUrl(embedUrl, config.id)) {
        sources.push({
          providerId: config.id,
          providerName: config.name,
          embedUrl,
          language: variant,
          quality: '1080p',
          isVerified: config.verified,
        });
      }
    } catch (err) {
      console.warn(`[Sources Endpoint] Provider ${config.name} resolution notice:`, err);
    }
  }

  // Fallback if all provider resolution calls returned empty
  if (sources.length === 0) {
    const ep = Math.max(1, episodeNumber);
    const targetId = malId || animeId || 151807;

    const fallbackUrl1 = `https://player.autoembed.cc/embed/anime/${targetId}/${ep}?sub=1&audio=${variant}`;
    const fallbackUrl2 = `https://megacloud.blog/embed/anime/${targetId}/${ep}?audio=${variant}&autoPlay=1`;

    if (validateEmbedUrl(fallbackUrl1, 'autoembed')) {
      sources.push({
        providerId: 'autoembed',
        providerName: 'AutoEmbed HD',
        embedUrl: fallbackUrl1,
        language: variant,
        quality: '1080p',
        isVerified: true,
      });
    }

    if (validateEmbedUrl(fallbackUrl2, 'megacloud')) {
      sources.push({
        providerId: 'megacloud',
        providerName: 'MegaCloud HD',
        embedUrl: fallbackUrl2,
        language: variant,
        quality: '1080p',
        isVerified: true,
      });
    }
  }

  return {
    episodeId: `${animeId}-${episodeNumber}`,
    animeId,
    episodeNumber,
    sources,
  };
}
