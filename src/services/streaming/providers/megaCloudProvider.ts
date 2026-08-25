import { StreamingProvider, StreamingSource, AudioVariant } from '../providerTypes';

export class MegaCloudProvider implements StreamingProvider {
  id = 'megacloud-hls';
  name = 'MegaCloud HD';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;
    const url = `https://megacloud.tv/embed/anime/${targetId}/${ep}?audio=${variant}&autoPlay=1`;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'embed',
      quality: '1080p',
    };
  }
}
