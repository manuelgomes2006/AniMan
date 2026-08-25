import { VideoProvider, StreamingSource, AudioVariant, ProviderStatus } from '../providerTypes';

export class VidCloudProvider implements VideoProvider {
  id = 'vidcloud';
  name = 'VidSrc HD';
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
