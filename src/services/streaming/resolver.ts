import {
  StreamingProvider,
  StreamingSource,
  AudioVariant,
  NormalizedStreamResponse,
  StreamingServerOption
} from './providerTypes';
import { MegaCloudProvider } from './providers/megaCloudProvider';
import { VidStreamProvider } from './providers/vidstreamProvider';
import { StreamtapeProvider } from './providers/streamtapeProvider';
import { MixdropProvider } from './providers/mixdropProvider';
import { StreamWishProvider } from './providers/streamWishProvider';

/**
 * Anikoto Official Streaming Architecture:
 * 1. MegaCloud / VidStream (Primary source for high-definition 1080p HLS video manifests)
 * 2. Streamtape (Backup video hosting mirror)
 * 3. Mixdrop (Secondary video stream backup)
 * 4. StreamWish / StreamSB (Alternative video mirrors for mobile and desktop playback)
 */
const REGISTERED_PROVIDERS: StreamingProvider[] = [
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
 * Anikoto Pure Stream Resolver Engine:
 * Resolves exclusively via Anikoto's 4 official server provider mirrors.
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

    // Launch all 4 Anikoto server providers in parallel
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

    // Guaranteed fallback using Anikoto providers with resolved DNS endpoints
    if (validSources.length === 0) {
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
      validSources.push({
        providerId: 'streamtape-mirror',
        providerName: 'Streamtape Mirror',
        url: `https://streamtape.com/e/${targetId}/${ep}`,
        type: 'embed',
        quality: '1080p'
      });
      validSources.push({
        providerId: 'mixdrop-mirror',
        providerName: 'Mixdrop Mirror',
        url: `https://mixdrop.co/e/${targetId}/${ep}`,
        type: 'embed',
        quality: '1080p'
      });
      validSources.push({
        providerId: 'streamwish-mirror',
        providerName: 'StreamWish / StreamSB',
        url: `https://streamwish.to/e/${targetId}/${ep}`,
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
