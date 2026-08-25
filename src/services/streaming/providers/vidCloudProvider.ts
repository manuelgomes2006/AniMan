import { VideoProvider, StreamingSource, AudioVariant, ProviderStatus } from '../providerTypes';
import { isAllowedEmbedUrl } from '../providerRegistry';

export class VidCloudProvider implements VideoProvider {
  id = 'vidcloud';
  name = 'VidSrc HD';
  allowedDomains = ['vidsrc.cc'];
  status: ProviderStatus = 'blocked_by_provider';

  async getEmbedUrl(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<string | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;
    const url = `https://vidsrc.cc/v2/embed/anime/${targetId}/${ep}?autoPlay=true&audio=${variant}`;

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
    return false;
  }
}
