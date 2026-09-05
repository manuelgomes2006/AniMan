import { VideoProvider, EpisodeSource, AudioVariant, ProviderStatus } from '../providerTypes';
import { isAllowedEmbedUrl } from '../providerRegistry';

/**
 * Official AniLink HD Streaming Provider Adapter
 * Fast, reliable iframe embed player with native SUB and DUB audio variant support.
 * Format: https://anilink.cc/watch/{targetId}/{episode}?variant={variant}&autoplay=1
 */
export class AniLinkProvider implements VideoProvider {
  id = 'anilink';
  name = 'AniLink HD';
  allowedDomains = ['anilink.cc'];
  status: ProviderStatus = 'available';

  async getEmbedUrl(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<string | null> {
    const targetId = malId || animeId || 11061;
    const ep = Math.max(1, episode);
    const url = `https://anilink.cc/watch/${targetId}/${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238AD7D0&secondaryColor=%23B2EFEA&iconColor=%23FFFFFF`;

    if (!isAllowedEmbedUrl(url, this.id)) return null;
    return url;
  }

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<EpisodeSource | null> {
    const url = await this.getEmbedUrl(animeId, title, episode, variant, malId);
    if (!url) return null;

    return {
      episodeId: `${animeId}-${episode}`,
      provider: this.id,
      providerName: this.name,
      language: variant,
      type: 'iframe',
      url,
      quality: '1080p',
      isVerified: true,
      status: this.status,
      allowedDomains: this.allowedDomains,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
