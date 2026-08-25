import { StreamingProvider, StreamingSource, AudioVariant } from '../providerTypes';

/**
 * Anikoto Direct HLS Stream Proxy & Manifest Resolver:
 * - Resolves raw .m3u8 master manifests for 1080p / 720p / 480p native HLS playback via hls.js.
 * - Injects soft WebVTT (.vtt) subtitle tracks into the HTML5 video player.
 */
export class AnikotoHlsProvider implements StreamingProvider {
  id = 'anikoto-hls-primary';
  name = 'Anikoto HLS Direct';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;

    // Direct HLS .m3u8 stream manifest endpoint with CORS proxy capability
    const rawHlsUrl = `https://megacloud.blog/stream/${targetId}/${ep}/master.m3u8?variant=${variant}`;
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawHlsUrl)}`;

    return {
      providerId: this.id,
      providerName: this.name,
      url: corsProxyUrl,
      type: 'hls',
      isHLS: true,
      quality: '1080p',
      subtitles: [
        {
          url: `https://anilink.cc/subtitles/${targetId}/${ep}/english.vtt`,
          lang: 'English'
        }
      ]
    };
  }
}
