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

const PROVIDER_TIMEOUT_MS = 5000;
const IN_FLIGHT_REQUESTS = new Map<string, Promise<NormalizedStreamResponse>>();
const RESOLVED_CACHE = new Map<string, { data: NormalizedStreamResponse; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache for resolved streams

// Query single provider with strict timeout & AbortSignal support
async function fetchProviderWithTimeout(
  provider: StreamingProvider,
  animeId: number,
  title: string,
  episode: number,
  variant: AudioVariant,
  malId?: number,
  signal?: AbortSignal
): Promise<StreamingSource | null> {
  if (signal?.aborted) return null;

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), PROVIDER_TIMEOUT_MS)
  );

  try {
    const result = await Promise.race([
      provider.getSources(animeId, title, episode, variant, malId, signal),
      timeoutPromise
    ]);
    return result;
  } catch (err) {
    if (signal?.aborted) return null;
    console.warn(`Provider ${provider.id} error:`, err);
    return null;
  }
}

/**
 * Ultra-Fast Parallel Stream Resolver Engine with Instant Request Cancellation:
 * - Runs ALL authorized providers concurrently in parallel.
 * - FIRST VALID SOURCE WINS: Resolves immediately as soon as the fastest provider responds.
 * - INSTANT ABORT: Once a provider starts playing, aborts all other pending provider requests!
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

  // Check short-lived cache for instant 0ms return
  const cached = RESOLVED_CACHE.get(requestKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  // Deduplicate in-flight requests
  if (IN_FLIGHT_REQUESTS.has(requestKey)) {
    return IN_FLIGHT_REQUESTS.get(requestKey)!;
  }

  const resolutionPromise = new Promise<NormalizedStreamResponse>((resolve) => {
    const abortController = new AbortController();
    let resolvedFirst = false;
    const validSources: StreamingSource[] = [];

    // Trigger all providers concurrently in parallel
    REGISTERED_PROVIDERS.forEach((provider) => {
      fetchProviderWithTimeout(
        provider,
        animeId,
        title,
        episode,
        variant,
        malId,
        abortController.signal
      ).then((source) => {
        if (source && source.url && !resolvedFirst) {
          resolvedFirst = true;
          validSources.push(source);

          // IMMEDIATELY ABORT ALL OTHER PENDING PROVIDER REQUESTS!
          abortController.abort();

          const servers: StreamingServerOption[] = REGISTERED_PROVIDERS.map((prov, idx) => ({
            id: prov.id,
            name: prov.name,
            providerId: prov.id,
            url: source.providerId === prov.id ? source.url : '',
            status: source.providerId === prov.id ? 'active' : 'degraded',
            isDefault: idx === 0
          }));

          const response: NormalizedStreamResponse = {
            animeId,
            episodeNumber: episode,
            variant,
            firstValidSource: source,
            sources: validSources,
            servers,
            resolvedAt: Date.now()
          };

          RESOLVED_CACHE.set(requestKey, { data: response, timestamp: Date.now() });
          IN_FLIGHT_REQUESTS.delete(requestKey);

          resolve(response);
        }
      });
    });

    // Fallback safety timeout if all providers time out or fail
    setTimeout(() => {
      if (!resolvedFirst) {
        resolvedFirst = true;
        abortController.abort();

        const fallbackSource = {
          providerId: 'anilink-primary',
          providerName: 'AniLink HD',
          url: `https://anilink.cc/watch/${animeId || 11061}/${episode}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238b5cf6&secondaryColor=%23a855f7&iconColor=%23FFFFFF`,
          type: 'embed' as const,
          quality: '1080p'
        };

        const fallbackResponse: NormalizedStreamResponse = {
          animeId,
          episodeNumber: episode,
          variant,
          firstValidSource: fallbackSource,
          sources: [fallbackSource],
          servers: [{ id: 'anilink-primary', name: 'AniLink HD', providerId: 'anilink-primary', url: fallbackSource.url, status: 'active', isDefault: true }],
          resolvedAt: Date.now()
        };

        RESOLVED_CACHE.set(requestKey, { data: fallbackResponse, timestamp: Date.now() });
        IN_FLIGHT_REQUESTS.delete(requestKey);

        resolve(fallbackResponse);
      }
    }, PROVIDER_TIMEOUT_MS + 200);
  });

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
