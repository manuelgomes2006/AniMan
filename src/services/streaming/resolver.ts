import {
  EpisodeSource,
  AudioVariant,
  Language,
  NormalizedStreamResponse,
  StreamingServerOption,
  EpisodeLanguageSource,
  EpisodeSourcesMap,
  ResolvedEpisodeData
} from './providerTypes';
import { getEpisodeSourcesHandler } from '../../api/sources';
import { VIDEO_PROVIDERS, isAllowedEmbedUrl } from './providerRegistry';

const IN_FLIGHT_REQUESTS = new Map<string, Promise<NormalizedStreamResponse>>();
const RESOLVED_CACHE = new Map<string, { data: NormalizedStreamResponse; timestamp: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

import { checkAnimeDubAvailability } from './dubDetector';

/**
 * Language selection algorithm — Selects best available audio variant based on episode sources and user preference
 */
export function getAvailableLanguage(
  episode: { sources?: EpisodeSourcesMap | null; hasDub?: boolean } | null | undefined,
  preferredLanguage: Language
): Language | null {
  if (!episode || !episode.sources) return null;

  const hasSub = Boolean(episode.sources.sub?.embedUrl);
  const hasDub = Boolean(episode.hasDub !== false && episode.sources.dub?.embedUrl);

  if (preferredLanguage === 'dub' && hasDub) {
    return 'dub';
  }

  if (hasSub) {
    return 'sub';
  }

  if (hasDub) {
    return 'dub';
  }

  return null;
}

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

/**
 * Resolves both SUB and DUB sources for a specific episode simultaneously.
 * Returns structured ResolvedEpisodeData containing sub and dub availability.
 */
export async function resolveEpisodeLanguageSources(options: {
  animeId: number;
  title: string;
  episode: number;
  malId?: number;
}): Promise<ResolvedEpisodeData> {
  const { animeId, title, episode, malId } = options;

  // Check whether this anime has an English Dub available
  const dubSupported = await checkAnimeDubAvailability(animeId, malId, title);

  const [subRes, dubRes] = await Promise.all([
    resolveParallelSources({ animeId, title, episode, variant: 'sub', malId }),
    dubSupported
      ? resolveParallelSources({ animeId, title, episode, variant: 'dub', malId })
      : Promise.resolve({
          animeId,
          episodeNumber: episode,
          variant: 'dub' as AudioVariant,
          firstValidSource: null,
          sources: [],
          servers: [],
          resolvedAt: Date.now(),
        }),
  ]);

  const subUrl = subRes.firstValidSource?.url || null;
  const dubUrl = dubSupported ? (dubRes.firstValidSource?.url || null) : null;

  const subSource: EpisodeLanguageSource | null = subUrl
    ? {
        embedUrl: subUrl,
        provider: subRes.firstValidSource?.provider,
        providerName: subRes.firstValidSource?.providerName,
        sources: subRes.sources,
        servers: subRes.servers,
      }
    : null;

  const dubSource: EpisodeLanguageSource | null = dubUrl
    ? {
        embedUrl: dubUrl,
        provider: dubRes.firstValidSource?.provider,
        providerName: dubRes.firstValidSource?.providerName,
        sources: dubRes.sources,
        servers: dubRes.servers,
      }
    : null;

  const sources: EpisodeSourcesMap = {
    sub: subSource,
    dub: dubSource,
  };

  const hasSub = Boolean(subSource?.embedUrl);
  const hasDub = Boolean(dubSupported && dubSource?.embedUrl);

  return {
    animeId,
    episodeNumber: episode,
    sources,
    hasSub,
    hasDub,
    resolvedAt: Date.now(),
  };
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
