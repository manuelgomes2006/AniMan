import { BaseStreamingProvider } from './provider';
import { StreamingResult, AudioVariant, ServerOption } from '../../types/stream';

export function getAniLinkStreamUrl(options: {
  animeId: number;
  episode: number;
  variant?: 'sub' | 'dub';
  server?: string;
}): string {
  const { animeId, episode, variant = 'sub', server = 'server-1' } = options;
  const ep = Math.max(1, episode);
  const targetId = animeId || 11061;

  // Server 2: VidStream / MegaCloud
  if (server === 'server-2' || server === 'vidstream-hd') {
    return `https://anilink.cc/e/${targetId}-ep-${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1`;
  }
  // Server 3: 2Embed Mirror
  if (server === 'server-3' || server === '2embed-mirror') {
    return `https://2embed.cc/embed/anime/${targetId}/${ep}`;
  }
  // Server 4: Streamtape HLS
  if (server === 'server-4' || server === 'streamtape-hls') {
    return `https://streamtape.com/e/${targetId}/${ep}`;
  }

  // Server 1: AniLink Primary (Default)
  return `https://anilink.cc/watch/${targetId}/${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238b5cf6&secondaryColor=%23a855f7&iconColor=%23FFFFFF`;
}

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

    const primaryEmbedUrl = getAniLinkStreamUrl({ animeId: targetId, episode: ep, variant, server: 'server-1' });

    const servers: ServerOption[] = [
      {
        id: 'server-1',
        name: 'Server 1 (AniLink Primary)',
        type: 'embed',
        url: primaryEmbedUrl,
        isDefault: true
      },
      {
        id: 'server-2',
        name: 'Server 2 (VidStream / MegaCloud)',
        type: 'embed',
        url: getAniLinkStreamUrl({ animeId: targetId, episode: ep, variant, server: 'server-2' })
      },
      {
        id: 'server-3',
        name: 'Server 3 (2Embed Mirror)',
        type: 'embed',
        url: getAniLinkStreamUrl({ animeId: targetId, episode: ep, variant, server: 'server-3' })
      },
      {
        id: 'server-4',
        name: 'Server 4 (Streamtape HLS)',
        type: 'embed',
        url: getAniLinkStreamUrl({ animeId: targetId, episode: ep, variant, server: 'server-4' })
      }
    ];

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
