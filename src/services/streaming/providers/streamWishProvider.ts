import { StreamingProvider, StreamingSource, AudioVariant } from '../providerTypes';

export class StreamWishProvider implements StreamingProvider {
  id = 'streamwish-mirror';
  name = 'StreamWish / StreamSB';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;
    const url = `https://streamwish.to/e/${targetId}/${ep}`;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'embed',
      quality: '1080p',
    };
  }
}
