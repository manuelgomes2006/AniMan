import { IStreamingProvider, StreamingResult, AudioVariant } from '../../types/stream';

export abstract class BaseStreamingProvider implements IStreamingProvider {
  abstract name: string;

  abstract getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant,
    malId?: number
  ): Promise<StreamingResult>;
}
