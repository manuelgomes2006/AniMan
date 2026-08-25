import {
  StreamingProvider,
  StreamingSource,
  AudioVariant,
  NormalizedStreamResponse,
  StreamingServerOption
} from './providerTypes';
import { AnikotoHlsProvider } from './providers/anikotoHlsProvider';
import { MegaCloudProvider } from './providers/megaCloudProvider';
import { VidStreamProvider } from './providers/vidstreamProvider';
import { StreamtapeProvider } from './providers/streamtapeProvider';
import { MixdropProvider } from './providers/mixdropProvider';
import { StreamWishProvider } from './providers/streamWishProvider';

/**
 * Anikoto Direct HLS & Multi-Host Streaming Architecture:
 * 1. Anikoto HLS Direct (Proxied .m3u8 HLS manifest engine via hls.js)
 * 2. MegaCloud / VidStream (Primary 1080p HLS video source)
 * 3. AutoEmbed HD (High-res adaptive mirror)
 * 4. Streamtape (Backup video hosting mirror)
 * 5. Mixdrop (Secondary video stream backup)
 * 6. StreamWish / StreamSB (Alternative video mirror)
 */
const REGISTERED_PROVIDERS: StreamingProvider[] = [
  new AnikotoHlsProvider(),
  new MegaCloudProvider(),
  new VidStreamProvider(),
  new StreamtapeProvider(),
  new MixdropProvider(),
  new StreamWishProvider(),
];

const IN_FLIGHT_REQUESTS = new Map<string, Promise<NormalizedStreamResponse>>();
const RESOLVED_CACHE = new Map<string, { data: NormalizedStreamResponse; timestamp: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

async function fetchProviderWithRetry(
  provider: StreamingProvider,
  animeId: number,
  title: string,
  episode: number,
  variant: AudioVariant,
  malId?: number,
  maxRetries = 1
): Promise<StreamingSource | null> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const source = await provider.getSources(animeId, title, episode, variant, malId);
      if (source && source.url) return source;
    } catch (err) {
      console.warn(`[Anikoto Engine] Server ${provider.name} failed (attempt ${attempt + 1}). Rebooting...`);
    }
    attempt++;
    if (attempt <= maxRetries) {
      await new Promise((res) => setTimeout(res, 200));
    }
  }
  return null;
}

/**
 * Anikoto Direct HLS Proxy & Multi-Host Resolver Engine:
 * Concurrently resolves direct .m3u8 manifest streams and server embeds in parallel.
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
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;

    // Launch all registered Anikoto server providers in parallel
    const providerPromises = REGISTERED_PROVIDERS.map((provider) =>
      fetchProviderWithRetry(provider, animeId, title, episode, variant, malId).catch(() => null)
    );

    const results = await Promise.allSettled(providerPromises);
    const validSources: StreamingSource[] = [];

    results.forEach((res) => {
      if (res.status === 'fulfilled' && res.value && res.value.url) {
        validSources.push(res.value);
      }
    });

    // Guaranteed fallback list
    if (validSources.length === 0) {
      validSources.push({
        providerId: 'anikoto-hls-primary',
        providerName: 'Anikoto HLS Direct',
        url: `https://corsproxy.io/?${encodeURIComponent(`https://megacloud.blog/stream/${targetId}/${ep}/master.m3u8?variant=${variant}`)}`,
        type: 'hls',
        isHLS: true,
        quality: '1080p'
      });
      validSources.push({
        providerId: 'megacloud-hls',
        providerName: 'MegaCloud HD',
        url: `https://megacloud.blog/embed/anime/${targetId}/${ep}?audio=${variant}&autoPlay=1`,
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
        url: match ? match.url : validSources[idx % validSources.length]?.url || validSources[0]?.url || '',
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

    // Prefetch Episode N+1
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
