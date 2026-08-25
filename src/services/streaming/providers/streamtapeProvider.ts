import { StreamingProvider, StreamingSource, AudioVariant } from '../providerTypes';

export class StreamtapeProvider implements StreamingProvider {
  id = 'streamtape-mirror';
  name = 'Streamtape Mirror';

  async getSources(
    animeId: number,
    title: string,
    episode: number,
    variant: AudioVariant = 'sub',
    malId?: number
  ): Promise<StreamingSource | null> {
    const ep = Math.max(1, episode);
    const targetId = malId || animeId || 151807;
    const url = `https://streamtape.com/e/${targetId}/${ep}`;

    return {
      providerId: this.id,
      providerName: this.name,
      url,
      type: 'embed',
      quality: '1080p',
    };
  }
}
