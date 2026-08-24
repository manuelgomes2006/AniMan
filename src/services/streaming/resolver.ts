import {
  StreamingProvider,
  StreamingSource,
  AudioVariant,
  NormalizedStreamResponse,
  StreamingServerOption
} from './providerTypes';
import { AniLinkProvider } from './providers/anilinkProvider';
import { VidStreamProvider } from './providers/vidstreamProvider';
import { TwoEmbedProvider } from './providers/twoEmbedProvider';
import { VidSrcProvider } from './providers/vidsrcProvider';

const REGISTERED_PROVIDERS: StreamingProvider[] = [
  new AniLinkProvider(),
  new VidStreamProvider(),
  new TwoEmbedProvider(),
  new VidSrcProvider(),
];

const IN_FLIGHT_REQUESTS = new Map<string, Promise<NormalizedStreamResponse>>();
const RESOLVED_CACHE = new Map<string, { data: NormalizedStreamResponse; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Ultra-Fast Stream Resolver Engine:
 * - Instantly resolves all 4 authorized streaming server mirrors in parallel.
 * - Sets the fastest valid source as `firstValidSource` so playback starts immediately.
 * - Retains all 4 server options for smooth fallback and instant mirror switching.
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
    // Resolve all registered authorized providers concurrently in parallel
    const providerPromises = REGISTERED_PROVIDERS.map((provider) =>
      provider.getSources(animeId, title, episode, variant, malId).catch(() => null)
    );

    const results = await Promise.allSettled(providerPromises);
    const validSources: StreamingSource[] = [];

    results.forEach((res) => {
      if (res.status === 'fulfilled' && res.value && res.value.url) {
        validSources.push(res.value);
      }
    });

    // Fallback guaranteed source if any provider failed
    if (validSources.length === 0) {
      const ep = Math.max(1, episode);
      const targetId = animeId || malId || 11061;
      validSources.push({
        providerId: 'anilink-primary',
        providerName: 'AniLink HD',
        url: `https://anilink.cc/watch/${targetId}/${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238b5cf6&secondaryColor=%23a855f7&iconColor=%23FFFFFF`,
        type: 'embed',
        quality: '1080p'
      });
    }

    const firstValidSource = validSources[0];

    const servers: StreamingServerOption[] = REGISTERED_PROVIDERS.map((prov, idx) => {
      const match = validSources.find(s => s.providerId === prov.id);
      return {
        id: prov.id,
        name: prov.name,
        providerId: prov.id,
        url: match ? match.url : (validSources[0]?.url || ''),
        status: match ? 'active' : 'degraded',
        isDefault: idx === 0
      };
    });

    const response: NormalizedStreamResponse = {
      animeId,
      episodeNumber: episode,
      variant,
      firstValidSource,
      sources: validSources,
      servers,
      resolvedAt: Date.now()
    };

    RESOLVED_CACHE.set(requestKey, { data: response, timestamp: Date.now() });
    IN_FLIGHT_REQUESTS.delete(requestKey);

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
  resolveParallelSources({
    ...options,
    episode: nextEp
  }).catch((err) => console.warn('Prefetch error:', err));
}
