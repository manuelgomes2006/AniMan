export type AudioVariant = 'sub' | 'dub';

export type ProviderStatus =
  | 'available'
  | 'blocked_by_provider'
  | 'invalid_url'
  | 'offline'
  | 'requires_authentication'
  | 'not_verified';

export interface StreamingSource {
  providerId: string;
  providerName: string;
  url: string;
  type: 'embed' | 'hls';
  quality?: string;
  isHLS?: boolean;
  isVerified?: boolean;
  status: ProviderStatus;
  allowedDomains?: string[];
  subtitles?: { url: string; lang: string }[];
}

export interface StreamingServerOption {
  id: string;
  name: string;
  providerId: string;
  url: string;
  status: 'active' | 'degraded' | 'offline';
  providerStatus: ProviderStatus;
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
  status: ProviderStatus;
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
  status: ProviderStatus;
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
  status: ProviderStatus;
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
