export interface NormalizedEpisode {
  number: number;
  title: string;
  airDate?: string;
  duration?: number;
  malId?: number;
  providerId?: string;
  isFiller?: boolean;
  isRecap?: boolean;
  subAvailable: boolean;
  dubAvailable: boolean;
  playable: boolean;
  thumbnail?: string;
}

const MAL_EPISODE_CACHE = new Map<number, NormalizedEpisode[]>();

/**
 * Episode Metadata Authority: MyAnimeList (MAL) & AniList
 * Supports 10, 100, 500, 1000, 2000+ episodes without any hardcoded 100-episode cap.
 */
export async function getNormalizedEpisodes(
  animeId: number,
  totalEpisodes: number = 12,
  malId?: number
): Promise<NormalizedEpisode[]> {
  const targetId = malId || animeId;

  if (MAL_EPISODE_CACHE.has(targetId)) {
    return MAL_EPISODE_CACHE.get(targetId)!;
  }

  const episodes: NormalizedEpisode[] = [];
  // Ensure epCount covers full series (e.g. 1120+ for One Piece, 500+ for Naruto Shippuden)
  const epCount = Math.max(totalEpisodes > 0 ? totalEpisodes : 12, 1);

  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${targetId}/episodes?page=1`);
    if (res.ok) {
      const json = await res.json();
      const malEpList = json.data || [];
      const malEpMap = new Map<number, any>();

      malEpList.forEach((item: any) => {
        const epNum = item.mal_id || item.episode;
        if (epNum) malEpMap.set(epNum, item);
      });

      // Generate complete episode list 1..epCount up to max
      for (let i = 1; i <= epCount; i++) {
        const malItem = malEpMap.get(i);
        episodes.push({
          number: i,
          title: malItem?.title || malItem?.title_romanji || `Episode ${i}`,
          airDate: malItem?.aired ? new Date(malItem.aired).toLocaleDateString() : undefined,
          duration: 24,
          malId: malItem?.mal_id,
          isFiller: Boolean(malItem?.filler),
          isRecap: Boolean(malItem?.recap),
          subAvailable: true,
          dubAvailable: true,
          playable: true,
        });
      }
    }
  } catch (err) {
    console.warn('MAL Episode fetch fallback:', err);
  }

  // If MAL query fails, fallback to complete 1..epCount episode list
  if (episodes.length === 0) {
    for (let i = 1; i <= epCount; i++) {
      episodes.push({
        number: i,
        title: `Episode ${i}`,
        subAvailable: true,
        dubAvailable: true,
        playable: true,
      });
    }
  }

  MAL_EPISODE_CACHE.set(targetId, episodes);
  return episodes;
}
