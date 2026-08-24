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
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

/**
 * Single Server Provider Runner with Auto-Retry ("Reboot on failure")
 */
async function fetchProviderWithRetry(
  provider: StreamingProvider,
  animeId: number,
  title: string,
  episode: number,
  variant: AudioVariant,
  malId?: number,
  signal?: AbortSignal,
  maxRetries = 2
): Promise<StreamingSource | null> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    if (signal?.aborted) return null;
    try {
      const source = await provider.getSources(animeId, title, episode, variant, malId);
      if (source && source.url) return source;
    } catch (err) {
      if (signal?.aborted) return null;
      console.warn(`[Stream Engine] Server ${provider.name} failed (attempt ${attempt + 1}). Rebooting...`);
    }
    attempt++;
    if (attempt <= maxRetries) {
      await new Promise((res) => setTimeout(res, 300)); // 300ms pause before rebooting failed server
    }
  }
  return null;
}

/**
 * Ultra-Fast First-Feed Winner Algorithm:
 * 1. Runs all 4 servers in parallel.
 * 2. If any server fails while searching, automatically reboots it.
 * 3. As soon as ANY server returns a valid video feed, ABORTS all other pending servers.
 * 4. Gets ready for the next episode.
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
    const abortController = new AbortController();
    const ep = Math.max(1, episode);
    const targetId = animeId || malId || 151807;

    const validSources: StreamingSource[] = [];

    // Launch all 4 servers with auto-reboot and race for the first valid video feed
    const serverPromises = REGISTERED_PROVIDERS.map(async (provider) => {
      const source = await fetchProviderWithRetry(
        provider,
        animeId,
        title,
        episode,
        variant,
        malId,
        abortController.signal
      );
      if (source && !abortController.signal.aborted) {
        validSources.push(source);
        // Cancel/abort all other pending server requests once first video feed is received
        abortController.abort();
      }
      return source;
    });

    await Promise.allSettled(serverPromises);

    // Guaranteed fallback if all servers were blocked/unreachable
    if (validSources.length === 0) {
      validSources.push({
        providerId: 'anilink-primary',
        providerName: 'AniLink HD',
        url: `https://anilink.cc/watch/${targetId}/${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238b5cf6&secondaryColor=%23a855f7&iconColor=%23FFFFFF`,
        type: 'embed',
        quality: '1080p'
      });
      validSources.push({
        providerId: 'vidstream-hd',
        providerName: 'AutoEmbed HD',
        url: `https://player.autoembed.cc/embed/anime/${targetId}/${ep}?sub=1&audio=${variant}`,
        type: 'embed',
        quality: '1080p'
      });
    }

    const firstValidSource = validSources[0];

    const servers: StreamingServerOption[] = REGISTERED_PROVIDERS.map((prov, idx) => {
      const match = validSources.find((s) => s.providerId === prov.id);
      return {
        id: prov.id,
        name: prov.name,
        providerId: prov.id,
        url: match ? match.url : validSources[0]?.url || '',
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

    // Get ready for next episode (prefetch Episode N+1)
    setTimeout(() => {
      prefetchNextEpisodeSources({
        animeId,
        title,
        episode: ep,
        variant,
        malId
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
      episode: nextEp
    }).catch((err) => console.warn('Next episode prefetch notice:', err));
  }
}
