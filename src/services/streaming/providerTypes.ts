export type AudioVariant = 'sub' | 'dub';

export interface StreamingSource {
  providerId: string;
  providerName: string;
  url: string;
  type: 'embed' | 'hls';
  quality?: string;
  isHLS?: boolean;
  subtitles?: { url: string; lang: string }[];
}

export interface StreamingServerOption {
  id: string;
  name: string;
  providerId: string;
  url: string;
  status: 'active' | 'degraded' | 'offline';
  isDefault?: boolean;
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

export interface StreamingProvider {
  id: string;
  name: string;
  getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant,
    malId?: number,
    signal?: AbortSignal
  ): Promise<StreamingSource | null>;
}
