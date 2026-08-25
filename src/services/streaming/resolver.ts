import {
  StreamingSource,
  AudioVariant,
  NormalizedStreamResponse,
  StreamingServerOption
} from './providerTypes';
import { getEpisodeSourcesHandler } from '../../api/sources';
import { VIDEO_PROVIDERS, validateEmbedUrl } from './providerRegistry';

const IN_FLIGHT_REQUESTS = new Map<string, Promise<NormalizedStreamResponse>>();
const RESOLVED_CACHE = new Map<string, { data: NormalizedStreamResponse; timestamp: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

/**
 * Verified Multi-Provider Parallel Resolver Engine:
 * Resolves episode sources via domain-allowlisted VideoProviders.
 */
export function resolveParallelSources(options: {
  animeId: number;
  title: string;
  episode: number;
  variant?: AudioVariant;
  malId?: number;
}): Promise<NormalizedStreamResponse> {
  const { animeId, title, episode, variant = 'sub', malId } = options;
  const requestKey = `${animeId}-${episode}-${variant}-${malId || 0}`;

  // Check cache for 0ms instant response
  const cached = RESOLVED_CACHE.get(requestKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  // Deduplicate in-flight requests
  if (IN_FLIGHT_REQUESTS.has(requestKey)) {
    return IN_FLIGHT_REQUESTS.get(requestKey)!;
  }

  const resolutionPromise = (async () => {
    const episodeData = await getEpisodeSourcesHandler(animeId, episode, variant, title, malId);

    const validSources: StreamingSource[] = episodeData.sources
      .filter((src) => validateEmbedUrl(src.embedUrl, src.providerId))
      .map((src) => ({
        providerId: src.providerId,
        providerName: src.providerName,
        url: src.embedUrl,
        type: 'embed',
        quality: src.quality || '1080p',
        isVerified: src.isVerified,
      }));

    const firstValidSource = validSources[0] || null;

    const servers: StreamingServerOption[] = VIDEO_PROVIDERS.map((prov, idx) => {
      const match = validSources.find((s) => s.providerId === prov.id);
      return {
        id: prov.id,
        name: prov.name,
        providerId: prov.id,
        url: match ? match.url : validSources[idx % validSources.length]?.url || firstValidSource?.url || '',
        status: prov.enabled ? (match ? 'active' : 'degraded') : 'offline',
        isDefault: idx === 0,
        audioVariant: variant,
        quality: '1080p',
        isVerified: prov.verified,
      };
    });

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

    // Prefetch Episode N+1
    setTimeout(() => {
      prefetchNextEpisodeSources({
        animeId,
        title,
        episode: Math.max(1, episode),
        variant,
        malId,
      });
    }, 1000);

    return response;
  })();

  IN_FLIGHT_REQUESTS.set(requestKey, resolutionPromise);
  return resolutionPromise;
}

// Prefetch Next Episode Source Readiness (Episode N+1)
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
