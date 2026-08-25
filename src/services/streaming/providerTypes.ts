export type AudioVariant = 'sub' | 'dub';

export type ProviderStatus =
  | 'available'
  | 'blocked_by_provider'
  | 'invalid_url'
  | 'offline'
  | 'requires_authentication'
  | 'not_verified';

export interface EpisodeSource {
  episodeId: string;
  provider: string;
  providerName: string;
  language: AudioVariant;
  type: 'iframe' | 'hls' | 'file';
  url: string;
  quality?: string;
  status: ProviderStatus;
  isVerified?: boolean;
  allowedDomains?: string[];
}

export type StreamingSource = EpisodeSource;

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
  firstValidSource: EpisodeSource | null;
  sources: EpisodeSource[];
  servers: StreamingServerOption[];
  resolvedAt: number;
}

export interface ProviderAdapter {
  id: string;
  name: string;
  allowedDomains: string[];
  status: ProviderStatus;
  getEpisodeSources(
    animeId: number,
    episodeNumber: number,
    language: AudioVariant,
    malId?: number,
    title?: string
  ): Promise<EpisodeSource[]>;
  healthCheck?(): Promise<boolean>;
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

export interface ProviderHealth {
  providerId: string;
  successCount: number;
  failureCount: number;
  lastSuccess?: string;
  lastFailure?: string;
}

export interface ProviderResolutionLog {
  provider: string;
  status: 'success' | 'failed' | 'no_source' | 'blocked_by_provider' | 'offline';
  reason?: string;
  urlType?: string;
}

export interface EpisodeDebugResponse {
  episodeId: string;
  catalogSource: string;
  providerResolution: ProviderResolutionLog[];
}
