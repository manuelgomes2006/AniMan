import { VideoProvider, EpisodeSource, AudioVariant, ProviderStatus } from '../providerTypes';
import { isAllowedEmbedUrl } from '../providerRegistry';

// In-memory cache for resolved MAL IDs
const malIdCache = new Map<number, number>();

// Known mappings for popular series to ensure immediate 0ms response
const KNOWN_MAL_MAPPINGS: Record<number, number> = {
  151807: 52299, // Solo Leveling
  20: 20,        // Naruto
  21: 21,        // One Piece
  142329: 5114,  // Demon Slayer
  38000: 38000,  // Demon Slayer MAL
  113415: 40748, // Jujutsu Kaisen
  154587: 52991, // Frieren
  127230: 44511, // Chainsaw Man
  11061: 11061,  // Hunter x Hunter
  16498: 16498,  // Attack on Titan
  101922: 38000, // Demon Slayer S1 AniList
};

/**
 * Resolves MyAnimeList ID from AniList anime ID
 */
async function resolveMalId(animeId: number, providedMalId?: number): Promise<number> {
  if (providedMalId && providedMalId > 0) {
    malIdCache.set(animeId, providedMalId);
    return providedMalId;
  }

  if (malIdCache.has(animeId)) {
    return malIdCache.get(animeId)!;
  }

  if (KNOWN_MAL_MAPPINGS[animeId]) {
    const id = KNOWN_MAL_MAPPINGS[animeId];
    malIdCache.set(animeId, id);
    return id;
  }

  // Fetch idMal from AniList GraphQL if not passed
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: 'query ($id: Int) { Media(id: $id, type: ANIME) { idMal } }',
        variables: { id: animeId },
      }),
    });
    if (res.ok) {
      const json = await res.json();
      const fetchedMalId = json.data?.Media?.idMal;
      if (fetchedMalId && typeof fetchedMalId === 'number' && fetchedMalId > 0) {
        malIdCache.set(animeId, fetchedMalId);
        return fetchedMalId;
      }
    }
  } catch (err) {
    console.warn('[MegaPlayProvider] Failed to resolve MAL ID from AniList:', err);
  }

  return animeId;
}

/**
 * Official MegaPlay HD Provider Adapter
 * Official Embed Spec:
 * SUB: <iframe src="https://megaplay.buzz/stream/mal/{malId}/{episodeNumber}/sub" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>
 * DUB: <iframe src="https://megaplay.buzz/stream/mal/{malId}/{episodeNumber}/dub" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>
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
    const targetMalId = await resolveMalId(animeId, malId);
    const ep = Math.max(1, episode);
    const audioVariant = variant === 'dub' ? 'dub' : 'sub';
    const url = `https://megaplay.buzz/stream/mal/${targetMalId}/${ep}/${audioVariant}`;

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
