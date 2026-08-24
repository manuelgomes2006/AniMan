import { WatchProgress, WatchlistItem, WatchlistCategory, UserProfile } from '../types/user';
import { AudioVariant } from '../types/stream';
import { AnimeMedia } from '../types/anime';

const HISTORY_KEY = 'aniworld_watch_history';
const WATCHLIST_KEY = 'aniworld_watchlist';
const AUDIO_PREF_KEY = 'aniworld_audio_pref';
const PROFILE_KEY = 'aniworld_user_profile';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Error loading key ${key}:`, err);
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving key ${key}:`, err);
  }
}

// --- AUDIO PREFERENCE ('sub' | 'dub') ---
export function getPreferredAudio(): AudioVariant {
  return (localStorage.getItem(AUDIO_PREF_KEY) as AudioVariant) || 'sub';
}

export function setPreferredAudio(variant: AudioVariant): void {
  localStorage.setItem(AUDIO_PREF_KEY, variant);
}

// --- WATCH HISTORY & TIMESTAMP PROGRESS ---
export function getWatchHistory(): WatchProgress[] {
  return load<WatchProgress[]>(HISTORY_KEY, []);
}

export function saveWatchProgress(
  animeId: number,
  episodeNumber: number,
  currentTime: number,
  duration: number,
  title: string,
  coverImage?: string
): void {
  if (!animeId || !episodeNumber) return;

  const history = getWatchHistory();
  const percentage = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  const record: WatchProgress = {
    animeId,
    episodeNumber,
    currentTime: Math.floor(currentTime),
    duration: Math.floor(duration),
    percentage,
    title,
    coverImage,
    updatedAt: new Date().toISOString()
  };

  const existingIdx = history.findIndex(
    item => item.animeId === animeId && item.episodeNumber === episodeNumber
  );

  let updated: WatchProgress[];
  if (existingIdx >= 0) {
    updated = [...history];
    updated[existingIdx] = record;
  } else {
    updated = [record, ...history];
  }

  save(HISTORY_KEY, updated.slice(0, 60));
}

export function getWatchProgress(animeId: number, episodeNumber: number): WatchProgress | undefined {
  const history = getWatchHistory();
  return history.find(item => item.animeId === animeId && item.episodeNumber === episodeNumber);
}

export function getLastWatched(animeId: number): WatchProgress | undefined {
  const history = getWatchHistory();
  return history.find(item => item.animeId === animeId);
}

// --- CATEGORIZED WATCHLIST ---
export function getWatchlist(): WatchlistItem[] {
  return load<WatchlistItem[]>(WATCHLIST_KEY, []);
}

export function getWatchlistByCategory(category: WatchlistCategory): WatchlistItem[] {
  return getWatchlist().filter(item => item.category === category);
}

export function getWatchlistItem(animeId: number): WatchlistItem | undefined {
  return getWatchlist().find(item => item.animeId === animeId);
}

export function setWatchlistCategory(anime: AnimeMedia, category: WatchlistCategory): WatchlistCategory | null {
  const watchlist = getWatchlist();
  const title = anime.title?.english || anime.title?.romaji || 'Anime';
  const coverImage = anime.coverImage?.extraLarge || anime.coverImage?.large;
  const bannerImage = anime.bannerImage;

  const existingIdx = watchlist.findIndex(item => item.animeId === anime.id);

  let updated: WatchlistItem[];
  if (existingIdx >= 0) {
    if (watchlist[existingIdx].category === category) {
      // Toggle off / remove
      updated = watchlist.filter(item => item.animeId !== anime.id);
      save(WATCHLIST_KEY, updated);
      return null;
    }
    updated = [...watchlist];
    updated[existingIdx].category = category;
  } else {
    updated = [
      {
        animeId: anime.id,
        title,
        coverImage,
        bannerImage,
        averageScore: anime.averageScore,
        format: anime.format,
        episodes: anime.episodes,
        category,
        addedAt: new Date().toISOString()
      },
      ...watchlist
    ];
  }

  save(WATCHLIST_KEY, updated);
  return category;
}

export function removeFromWatchlist(animeId: number): void {
  const updated = getWatchlist().filter(item => item.animeId !== animeId);
  save(WATCHLIST_KEY, updated);
}

// --- USER PROFILE ---
const DEFAULT_USER: UserProfile = {
  id: 'usr_001',
  username: 'JinWoo',
  email: 'shadow@aniworld.io',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  preferredAudio: 'sub',
  customTheme: 'purple'
};

export function getUserProfile(): UserProfile {
  return load<UserProfile>(PROFILE_KEY, DEFAULT_USER);
}

export function updateUserProfile(data: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const updated = { ...current, ...data };
  save(PROFILE_KEY, updated);
  return updated;
}
