export type AudioVariant = 'sub' | 'dub';

export interface StreamingSource {
  providerId: string;
  providerName: string;
  url: string;
  type: 'embed' | 'hls';
  quality?: string;
  isHLS?: boolean;
  isVerified?: boolean;
  allowedDomains?: string[];
  subtitles?: { url: string; lang: string }[];
}

export interface StreamingServerOption {
  id: string;
  name: string;
  providerId: string;
  url: string;
  status: 'active' | 'degraded' | 'offline';
  isDefault?: boolean;
  audioVariant?: AudioVariant;
  quality?: string;
  isVerified?: boolean;
}

export interface NormalizedStreamResponse {
  animeId: number;
  episodeNumber: number;
  variant: AudioVariant;
  firstValidSource: StreamingSource | null;
  sources: StreamingSource[];
  servers: StreamingServerOption[];
  resolvedAt: number;
}

export interface VideoProvider {
  id: string;
  name: string;
  allowedDomains: string[];
  getEmbedUrl(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant,
    malId?: number
  ): Promise<string | null>;
  isAvailable(): Promise<boolean>;
}

export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  allowedDomains: string[];
  verified: boolean;
  requiresAuth?: boolean;
}

export interface EpisodeSourceItem {
  providerId: string;
  providerName: string;
  embedUrl: string;
  language: AudioVariant;
  quality?: string;
  isVerified: boolean;
}

export interface EpisodeSources {
  episodeId: string;
  animeId: number;
  episodeNumber: number;
  sources: EpisodeSourceItem[];
}

export interface ProviderHealth {
  providerId: string;
  successCount: number;
  failureCount: number;
  lastSuccess?: string;
  lastFailure?: string;
}
