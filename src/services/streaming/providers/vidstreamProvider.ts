import { StreamingProvider, StreamingSource, AudioVariant } from '../providerTypes';

export class VidStreamProvider implements StreamingProvider {
  id = 'vidstream-hd';
  name = 'AutoEmbed HD';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;
    const url = `https://player.autoembed.cc/embed/anime/${targetId}/${ep}?sub=1&audio=${variant}`;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'embed',
      quality: '1080p',
    };
  }
}
