import { VideoProvider, StreamingSource, AudioVariant, ProviderStatus } from '../providerTypes';

export class KiwiProvider implements VideoProvider {
  id = 'kiwi';
  name = 'Kiwi / Kwik';
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
