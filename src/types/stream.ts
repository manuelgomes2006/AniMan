export type AudioVariant = 'sub' | 'dub';

export interface VideoSource {
  name: string;
  url: string;
  isHLS: boolean;
  quality?: string;
}

export interface ServerOption {
  id: string;
  name: string;
  type: 'embed' | 'hls' | 'mp4';
  url: string;
  quality?: string;
  isDefault?: boolean;
}

export interface SubtitleTrack {
  url: string;
  lang: string;
}

export interface StreamingResult {
  provider: string;
  embedUrl?: string;
  variant: AudioVariant;
  isDubAvailable: boolean;
  servers: ServerOption[];
  sources: VideoSource[];
  subtitles: SubtitleTrack[];
}

export interface IStreamingProvider {
  name: string;
  getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant,
    malId?: number
  ): Promise<StreamingResult>;
}
