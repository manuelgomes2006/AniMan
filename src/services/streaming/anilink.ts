import { BaseStreamingProvider } from './provider';
import { StreamingResult, AudioVariant, ServerOption } from '../../types/stream';

export interface StreamUrlOptions {
  animeId: number;
  episode: number;
  variant?: 'sub' | 'dub';
  malId?: number;
  server?: string;
}

export function getAniLinkStreamUrl(options: StreamUrlOptions): string {
  const { animeId, episode, variant = 'sub', malId, server = 'server-1' } = options;
  const ep = Math.max(1, episode);
  const targetAniListId = animeId || 11061;
  const targetMalId = malId || animeId || 11061;

  // Server 1: AniLink Primary Embed (AniList ID)
  if (server === 'server-1' || !server) {
    return `https://anilink.cc/watch/${targetAniListId}/${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238AD7D0&secondaryColor=%23B2EFEA&iconColor=%23FFFFFF`;
  }

  // Server 2: AniLink Mirror (MAL ID)
  if (server === 'server-2') {
    return `https://anilink.cc/watch/${targetMalId}/${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238AD7D0&secondaryColor=%23B2EFEA&iconColor=%23FFFFFF`;
  }

  // Server 3: 2Embed Resolver
  if (server === 'server-3') {
    return `https://2embed.cc/embed/anime/${targetMalId}/${ep}`;
  }

  // Server 4: VidSrc Resolver
  if (server === 'server-4') {
    return `https://vidsrc.to/embed/anime/${targetMalId}/${ep}`;
  }

  return `https://anilink.cc/watch/${targetAniListId}/${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238AD7D0&secondaryColor=%23B2EFEA&iconColor=%23FFFFFF`;
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
    const primaryEmbedUrl = getAniLinkStreamUrl({ animeId, episode: ep, variant, malId, server: 'server-1' });

    const servers: ServerOption[] = [
      {
        id: 'server-1',
        name: 'AniLink Primary',
        type: 'embed',
        url: primaryEmbedUrl,
        isDefault: true
      },
      {
        id: 'server-2',
        name: 'AniLink Mirror',
        type: 'embed',
        url: getAniLinkStreamUrl({ animeId, episode: ep, variant, malId, server: 'server-2' })
      },
      {
        id: 'server-3',
        name: '2Embed Mirror',
        type: 'embed',
        url: getAniLinkStreamUrl({ animeId, episode: ep, variant, malId, server: 'server-3' })
      },
      {
        id: 'server-4',
        name: 'VidSrc Mirror',
        type: 'embed',
        url: getAniLinkStreamUrl({ animeId, episode: ep, variant, malId, server: 'server-4' })
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
          name: '1080p HD Stream',
          url: primaryEmbedUrl,
          isHLS: false,
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
