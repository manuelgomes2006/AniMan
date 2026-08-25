import { VideoProvider, StreamingSource, AudioVariant } from '../providerTypes';
import { validateEmbedUrl } from '../providerRegistry';

export class VidPlayProvider implements VideoProvider {
  id = 'vidplay';
  name = 'VidPlay HD';
  allowedDomains = ['vidplay.online', 'vidplay.site'];

  async getEmbedUrl(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<string | null> {
    // Requires authorized server API key or verified credential configuration
    const apiKey = typeof process !== 'undefined' ? process.env?.VIDPLAY_API_KEY : undefined;
    if (!apiKey) {
      // Unverified/unauthenticated configuration safely returns null
      return null;
    }

    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;
    const url = `https://vidplay.online/e/${targetId}/${ep}`;

    if (!validateEmbedUrl(url, this.id)) return null;
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
      isVerified: false,
      allowedDomains: this.allowedDomains,
    };
  }

  async isAvailable(): Promise<boolean> {
    const apiKey = typeof process !== 'undefined' ? process.env?.VIDPLAY_API_KEY : undefined;
    return Boolean(apiKey);
  }
}
