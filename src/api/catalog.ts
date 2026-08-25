import { AnimeMedia, AniListPageResponse } from '../types/anime';
import { catalogService } from '../services/catalog/catalogService';

/**
 * Server-Side Catalog API Handler (/api/anime/search)
 */
export async function searchAnimeCatalogHandler(query: string, page = 1): Promise<AniListPageResponse> {
  return catalogService.search({ search: query, page });
}

/**
 * Server-Side Catalog Details Handler (/api/anime/:id)
 */
export async function getAnimeDetailsCatalogHandler(animeId: number): Promise<AnimeMedia> {
  return catalogService.getDetails(animeId);
}
