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
    const targetId = animeId || malId || 151807;
    // Ultra high-uptime MegaCloud DNS gateway
    const url = `https://anilink.cc/watch/${targetId}/${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238b5cf6&secondaryColor=%23a855f7&iconColor=%23FFFFFF`;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'embed',
      quality: '1080p',
    };
  }
}
