import { StreamingProvider, StreamingSource, AudioVariant } from '../providerTypes';

export class TwoEmbedProvider implements StreamingProvider {
  id = '2embed-mirror';
  name = '2Embed HD';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;
    const url = `https://2embed.cc/embed/anime/${targetId}/${ep}`;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'embed',
      quality: '1080p',
    };
  }
}
