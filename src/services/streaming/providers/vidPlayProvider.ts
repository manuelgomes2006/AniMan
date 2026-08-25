import { VideoProvider, StreamingSource, AudioVariant, ProviderStatus } from '../providerTypes';

export class VidPlayProvider implements VideoProvider {
  id = 'vidplay';
  name = 'VidPlay HD';
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
