import { StreamingProvider, StreamingSource, AudioVariant } from '../providerTypes';

export class VidSrcProvider implements StreamingProvider {
  id = 'vidsrc-mirror';
  name = 'VidSrc Mirror';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 11061;
    const url = `https://vidsrc.to/embed/anime/${targetId}/${ep}`;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'embed',
      quality: '1080p',
    };
  }
}
