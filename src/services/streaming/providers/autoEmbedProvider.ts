import { VideoProvider, StreamingSource, AudioVariant } from '../providerTypes';
import { validateEmbedUrl } from '../providerRegistry';

export class AutoEmbedProvider implements VideoProvider {
  id = 'autoembed';
  name = 'AutoEmbed HD';
  allowedDomains = ['player.autoembed.cc', 'autoembed.cc', '2embed.cc'];

  async getEmbedUrl(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<string | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;
    const url = `https://player.autoembed.cc/embed/anime/${targetId}/${ep}?sub=1&audio=${variant}`;

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
      isVerified: true,
      allowedDomains: this.allowedDomains,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
