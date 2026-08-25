import { WatchProgress } from '../types/user';
import { fetchWatchHistoryFromSupabase, updateWatchProgress, clearWatchHistory } from '../services/userStore';
import { AnimeMedia } from '../types/anime';

/**
 * Server-Side User History API Handler (GET /api/me/history)
 */
export async function getUserHistoryHandler(): Promise<WatchProgress[]> {
  return fetchWatchHistoryFromSupabase();
}

/**
 * Server-Side User Progress Update Handler (POST /api/me/history)
 */
export async function updateUserHistoryHandler(
  anime: AnimeMedia,
  episodeNumber: number,
  currentTime: number,
  duration: number
): Promise<void> {
  updateWatchProgress(anime, episodeNumber, currentTime, duration);
}

/**
 * Server-Side User History Reset Handler (DELETE /api/me/history)
 */
export async function deleteUserHistoryHandler(): Promise<void> {
  return clearWatchHistory();
}
