import { StreamingProvider, StreamingSource, AudioVariant } from '../providerTypes';

export class VidSrcProvider implements StreamingProvider {
  id = 'vidsrc-mirror';
  name = 'VidSrc HD';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;
    const url = `https://vidsrc.cc/v2/embed/anime/${targetId}/${ep}?autoPlay=true`;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'embed',
      quality: '1080p',
    };
  }
}
