import { VideoProvider, EpisodeSource, AudioVariant, ProviderStatus } from '../providerTypes';
import { isAllowedEmbedUrl } from '../providerRegistry';

/**
 * Official MegaPlay HD Provider Adapter
 * Embed URL format: https://megaplay.buzz/stream/mal/{malId}/{episodeNumber}/{variant}
 */
export class MegaPlayProvider implements VideoProvider {
  id = 'megaplay';
  name = 'MegaPlay HD';
  allowedDomains = ['megaplay.buzz'];
  status: ProviderStatus = 'available';

  async getEmbedUrl(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<string | null> {
    const targetId = malId || animeId || 21;
    const ep = Math.max(1, episode);
    const url = `https://megaplay.buzz/stream/mal/${targetId}/${ep}/${variant}`;

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
