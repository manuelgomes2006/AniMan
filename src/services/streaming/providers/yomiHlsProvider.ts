import { StreamingProvider, StreamingSource, AudioVariant } from '../providerTypes';

export class YomiHlsProvider implements StreamingProvider {
  id = 'yomi-hls-primary';
  name = 'AniWorld HLS Direct';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;

    // Direct HLS .m3u8 stream manifest URL
    const url = `https://anilink.cc/stream/${targetId}/${ep}/master.m3u8?variant=${variant}`;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'hls',
      quality: '1080p',
    };
  }
}
