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

/**
 * Ultra-Fast Parallel Stream Resolver Engine:
 * - Runs ALL authorized providers concurrently in parallel.
 * - FIRST VALID SOURCE WINS: Resolves as soon as the fastest provider responds.
 * - Deduplicates identical in-flight requests.
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
    let resolvedFirst = false;
    const providerPromises: Promise<StreamingSource | null>[] = [];
    const validSources: StreamingSource[] = [];

    // Trigger all providers concurrently in parallel
    REGISTERED_PROVIDERS.forEach((provider) => {
      const p = fetchProviderWithTimeout(provider, animeId, title, episode, variant, malId);
      providerPromises.push(p);

      p.then((source) => {
        if (source && source.url) {
          validSources.push(source);

          // FIRST VALID SOURCE WINS -> Resolve player immediately on first response!
          if (!resolvedFirst) {
            resolvedFirst = true;

            const initialServers: StreamingServerOption[] = REGISTERED_PROVIDERS.map((prov, idx) => ({
              id: prov.id,
              name: prov.name,
              providerId: prov.id,
              url: source.providerId === prov.id ? source.url : '',
              status: source.providerId === prov.id ? 'active' : 'degraded',
              isDefault: idx === 0
            }));

            const initialResponse: NormalizedStreamResponse = {
              animeId,
              episodeNumber: episode,
              variant,
              firstValidSource: source,
              sources: [source],
              servers: initialServers,
              resolvedAt: Date.now()
            };

            resolve(initialResponse);
          }
        }
      });
    });

    // Complete background aggregation for all providers
    Promise.allSettled(providerPromises).then((results) => {
      const allSources: StreamingSource[] = [];
      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value && res.value.url) {
          allSources.push(res.value);
        }
      });

      const firstValid = allSources.length > 0 ? allSources[0] : null;
      const servers: StreamingServerOption[] = REGISTERED_PROVIDERS.map((prov, idx) => {
        const match = allSources.find(s => s.providerId === prov.id);
        return {
          id: prov.id,
          name: prov.name,
          providerId: prov.id,
          url: match ? match.url : '',
          status: match ? 'active' : 'offline',
          isDefault: idx === 0
        };
      });

      const finalResponse: NormalizedStreamResponse = {
        animeId,
        episodeNumber: episode,
        variant,
        firstValidSource: firstValid,
        sources: allSources.length > 0 ? allSources : validSources,
        servers,
        resolvedAt: Date.now()
      };

      RESOLVED_CACHE.set(requestKey, { data: finalResponse, timestamp: Date.now() });
      IN_FLIGHT_REQUESTS.delete(requestKey);

      if (!resolvedFirst) {
        resolve(finalResponse);
      }
    });
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
