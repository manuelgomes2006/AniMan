import { AnimeMedia, AniListPageResponse } from '../../types/anime';
import {
  getAnimeDetails,
  searchAnime,
  getTrendingAnime,
  getPopularAnime,
  getTopRatedAnime,
  getCurrentlyAiringAnime,
  SearchOptions
} from '../anilist/client';

/**
 * Anikoto-Style Catalog Service:
 * Manages anime search, metadata, trending feeds, airing schedules, and detail retrieval.
 */
export class CatalogService {
  async getDetails(animeId: number): Promise<AnimeMedia> {
    return getAnimeDetails(animeId);
  }

  async search(options: SearchOptions = {}): Promise<AniListPageResponse> {
    return searchAnime(options);
  }

  async getTrending(page = 1, perPage = 12): Promise<AnimeMedia[]> {
    return getTrendingAnime(page, perPage);
  }

  async getPopular(page = 1, perPage = 12): Promise<AnimeMedia[]> {
    return getPopularAnime(page, perPage);
  }

  async getTopRated(page = 1, perPage = 12): Promise<AnimeMedia[]> {
    return getTopRatedAnime(page, perPage);
  }

  async getCurrentlyAiring(page = 1, perPage = 12): Promise<AnimeMedia[]> {
    return getCurrentlyAiringAnime(page, perPage);
  }
}

export const catalogService = new CatalogService();
