import {
  EpisodeSource,
  AudioVariant,
  NormalizedStreamResponse,
  StreamingServerOption
} from './providerTypes';
import { getEpisodeSourcesHandler } from '../../api/sources';
import { VIDEO_PROVIDERS, isAllowedEmbedUrl } from './providerRegistry';

const IN_FLIGHT_REQUESTS = new Map<string, Promise<NormalizedStreamResponse>>();
const RESOLVED_CACHE = new Map<string, { data: NormalizedStreamResponse; timestamp: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

/**
 * Provider-Agnostic Source Resolver Engine:
 * Maps catalog IDs to source episode IDs and queries active Provider Adapters.
 * Emits detailed server logs without exposing sensitive tokens.
 */
export function resolveParallelSources(options: {
  animeId: number;
  title: string;
  episode: number;
  variant?: AudioVariant;
  malId?: number;
}): Promise<NormalizedStreamResponse> {
  const { animeId, title, episode, variant = 'sub', malId } = options;
  const episodeId = `${animeId}-${episode}`;
  const requestKey = `${animeId}-${episode}-${variant}-${malId || 0}`;

  console.log(`[PLAYER] Episode requested: ${episodeId} (${title})`);
  console.log(`[RESOLVER] Looking up source episode for Catalog ID: ${animeId}, MAL ID: ${malId || 'N/A'}`);

  // Check cache for 0ms instant response
  const cached = RESOLVED_CACHE.get(requestKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[RESOLVER] Serving cached sources for ${episodeId}`);
    return Promise.resolve(cached.data);
  }

  // Deduplicate in-flight requests
  if (IN_FLIGHT_REQUESTS.has(requestKey)) {
    return IN_FLIGHT_REQUESTS.get(requestKey)!;
  }

  const resolutionPromise = (async () => {
    const episodeData = await getEpisodeSourcesHandler(animeId, episode, variant, title, malId);

    const validSources: EpisodeSource[] = episodeData.sources
      .filter((src) => isAllowedEmbedUrl(src.url, src.provider))
      .map((src) => ({
        episodeId,
        provider: src.provider,
        providerName: src.providerName,
        language: variant,
        type: src.type || 'iframe',
        url: src.url,
        quality: src.quality || '1080p',
        status: src.status || 'available',
        isVerified: src.isVerified,
      }));

    const firstValidSource = validSources.find((s) => s.status === 'available') || validSources[0] || null;

    const servers: StreamingServerOption[] = VIDEO_PROVIDERS.map((prov, idx) => {
      const match = validSources.find((s) => s.provider === prov.id);
      return {
        id: prov.id,
        name: prov.name,
        providerId: prov.id,
        url: match ? match.url : '',
        status: prov.enabled && prov.status === 'available' ? 'active' : 'offline',
        providerStatus: prov.status,
        isDefault: idx === 0,
        audioVariant: variant,
        quality: '1080p',
        isVerified: prov.verified,
      };
    });

    console.log(`[PLAYER] Returning ${validSources.length} playable sources for episode ${episodeId}`);

    const response: NormalizedStreamResponse = {
      animeId,
      episodeNumber: episode,
      variant,
      firstValidSource,
      sources: validSources,
      servers,
      resolvedAt: Date.now(),
    };

    RESOLVED_CACHE.set(requestKey, { data: response, timestamp: Date.now() });
    IN_FLIGHT_REQUESTS.delete(requestKey);

    return response;
  })();

  IN_FLIGHT_REQUESTS.set(requestKey, resolutionPromise);
  return resolutionPromise;
}

export function prefetchNextEpisodeSources(options: {
  animeId: number;
  title: string;
  episode: number;
  variant?: AudioVariant;
  malId?: number;
}): void {
  const nextEp = options.episode + 1;
  const nextRequestKey = `${options.animeId}-${nextEp}-${options.variant || 'sub'}-${options.malId || 0}`;

  if (!RESOLVED_CACHE.has(nextRequestKey) && !IN_FLIGHT_REQUESTS.has(nextRequestKey)) {
    resolveParallelSources({
      ...options,
      episode: nextEp,
    }).catch((err) => console.warn('Next episode prefetch notice:', err));
  }
}
