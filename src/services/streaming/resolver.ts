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
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes TTL for stream sources

// Query single provider with strict timeout
async function fetchProviderWithTimeout(
  provider: StreamingProvider,
  animeId: number,
  title: string,
  episode: number,
  variant: AudioVariant,
  malId?: number
): Promise<StreamingSource | null> {
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), PROVIDER_TIMEOUT_MS)
  );

  try {
    const result = await Promise.race([
      provider.getSources(animeId, title, episode, variant, malId),
      timeoutPromise
    ]);
    return result;
  } catch (err) {
    console.warn(`Provider ${provider.id} error:`, err);
    return null;
  }
}

// Parallel Source Resolution Engine (First-Valid-Source Wins + Request Deduplication)
export function resolveParallelSources(options: {
  animeId: number;
  title: string;
  episode: number;
  variant?: AudioVariant;
  malId?: number;
}): Promise<NormalizedStreamResponse> {
  const { animeId, title, episode, variant = 'sub', malId } = options;
  const requestKey = `${animeId}-${episode}-${variant}-${malId || 0}`;

  // Check short-lived cache
  const cached = RESOLVED_CACHE.get(requestKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  // Deduplicate in-flight requests
  if (IN_FLIGHT_REQUESTS.has(requestKey)) {
    return IN_FLIGHT_REQUESTS.get(requestKey)!;
  }

  const resolutionPromise = (async () => {
    const start = Date.now();

    // Query all registered authorized providers concurrently
    const providerPromises = REGISTERED_PROVIDERS.map((provider) =>
      fetchProviderWithTimeout(provider, animeId, title, episode, variant, malId)
    );

    const results = await Promise.allSettled(providerPromises);
    const validSources: StreamingSource[] = [];

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value && res.value.url) {
        validSources.push(res.value);
      }
    }

    const firstValidSource = validSources.length > 0 ? validSources[0] : null;

    const servers: StreamingServerOption[] = REGISTERED_PROVIDERS.map((p, idx) => {
      const matched = validSources.find((s) => s.providerId === p.id);
      return {
        id: p.id,
        name: p.name,
        providerId: p.id,
        url: matched ? matched.url : '',
        status: matched ? 'active' : 'offline',
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
