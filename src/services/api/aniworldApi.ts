import { getAnimeDetails, searchAnime, getTrendingAnime, getPopularAnime } from '../anilist/client';
import { getNormalizedEpisodes, NormalizedEpisode } from '../episodes/episodes';
import { resolveParallelSources } from '../streaming/resolver';
import { NormalizedStreamResponse } from '../streaming/providerTypes';
import { getUserProfile, getWatchHistory, WatchlistItem, getWatchlist } from '../userStore';
import { AnimeMedia } from '../../types/anime';

export interface UnifiedAnimePageData {
  anime: AnimeMedia;
  episodes: NormalizedEpisode[];
  watchlistState?: WatchlistItem;
}

export async function getUnifiedAnimeData(animeId: number): Promise<UnifiedAnimePageData> {
  const anime = await getAnimeDetails(animeId);
  const episodes = await getNormalizedEpisodes(animeId, anime.episodes || 12, anime.idMal);
  const watchlist = getWatchlist();
  const watchlistState = watchlist.find(item => item.anime.id === animeId);

  return {
    anime,
    episodes,
    watchlistState
  };
}

export async function getUnifiedWatchState(animeId: number, episodeNum: number, variant: 'sub' | 'dub' = 'sub'): Promise<{
  anime: AnimeMedia;
  episodes: NormalizedEpisode[];
  stream: NormalizedStreamResponse;
}> {
  const anime = await getAnimeDetails(animeId);
  const [episodes, stream] = await Promise.all([
    getNormalizedEpisodes(animeId, anime.episodes || 12, anime.idMal),
    resolveParallelSources({
      animeId,
      title: anime.title?.english || anime.title?.romaji || 'Anime',
      episode: episodeNum,
      variant,
      malId: anime.idMal
    })
  ]);

  return {
    anime,
    episodes,
    stream
  };
}
