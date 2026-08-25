import { VideoProvider, StreamingSource, AudioVariant, ProviderStatus } from '../providerTypes';

export class AniLinkProvider implements VideoProvider {
  id = 'anilink';
  name = 'AniLink HD';
  allowedDomains: string[] = [];
  status: ProviderStatus = 'offline';

  async getEmbedUrl(): Promise<string | null> {
    return null;
  }

  async getSources(): Promise<StreamingSource | null> {
    return null;
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}
