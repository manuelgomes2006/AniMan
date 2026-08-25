import { VideoProvider, StreamingSource, AudioVariant, ProviderStatus } from '../providerTypes';
import { isAllowedEmbedUrl } from '../providerRegistry';

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
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;
    const url = `https://anilink.cc/watch/${targetId}/${ep}?variant=${variant}&autoplay=1&autoskipIntro=1&autoskipOutro=1&primaryColor=%238b5cf6&secondaryColor=%23a855f7&iconColor=%23FFFFFF`;

    if (!isAllowedEmbedUrl(url, this.id)) return null;
    return url;
  }

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const url = await this.getEmbedUrl(animeId, title, episode, variant, malId);
    if (!url) return null;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'embed',
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
