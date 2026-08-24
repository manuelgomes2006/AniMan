import { StreamingProvider, StreamingSource, AudioVariant } from '../providerTypes';

export class VidStreamProvider implements StreamingProvider {
  id = 'vidstream-hd';
  name = 'VidStream / MegaCloud';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const ep = Math.max(1, episode);
    const targetId = animeId || 11061;
    const url = `https://anilink.cc/e/${targetId}-ep-${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1`;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'embed',
      quality: '1080p',
    };
  }
}
