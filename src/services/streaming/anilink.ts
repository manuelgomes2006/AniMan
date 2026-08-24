import { BaseStreamingProvider } from './provider';
import { StreamingResult, AudioVariant, ServerOption } from '../../types/stream';

export class AniLinkProvider extends BaseStreamingProvider {
  name = 'AniLink';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingResult> {
    const ep = Math.max(1, episode);
    const targetId = animeId || 11061;

    // Exact AniLink Embed Spec with autoplay, autoskipIntro, autoskipOutro, & brand colors
    const primaryEmbedUrl = `https://anilink.cc/watch/${targetId}/${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238b5cf6&secondaryColor=%23a855f7&iconColor=%23FFFFFF`;

    // Dynamic Server Options
    const servers: ServerOption[] = [
      {
        id: 'anilink-primary',
        name: 'Server 1 (AniLink Fast)',
        type: 'embed',
        url: primaryEmbedUrl,
        isDefault: true
      },
      {
        id: 'anilink-direct',
        name: 'Server 2 (AniLink Direct)',
        type: 'embed',
        url: `https://anilink.cc/e/${targetId}-ep-${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1`
      }
    ];

    if (malId) {
      servers.push({
        id: '2embed',
        name: 'Server 3 (2Embed Mirror)',
        type: 'embed',
        url: `https://2embed.cc/embed/anime/${malId}/${ep}`
      });
    }

    servers.push({
      id: 'hls-fallback',
      name: 'Server 4 (Backup HLS Engine)',
      type: 'hls',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    });

    return {
      provider: this.name,
      embedUrl: primaryEmbedUrl,
      variant,
      isDubAvailable: true,
      servers,
      sources: [
        {
          name: '1080p Adaptive HLS',
          url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          isHLS: true,
          quality: '1080p'
        }
      ],
      subtitles: [
        { url: '', lang: 'English [SoftSub]' }
      ]
    };
  }
}

export const activeStreamingProvider = new AniLinkProvider();
