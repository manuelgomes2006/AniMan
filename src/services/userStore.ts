import { WatchProgress, UserProfile } from '../types/user';
import { AnimeMedia } from '../types/anime';

const STORAGE_KEYS = {
  USER: 'aniworld_user',
  WATCH_HISTORY: 'aniworld_watch_history',
  WATCHLIST: 'aniworld_watchlist',
  PREFERRED_AUDIO: 'aniworld_preferred_audio',
};

// Default Guest User Profile
const DEFAULT_USER: UserProfile = {
  id: 'usr_guest_01',
  username: 'Shadow',
  email: 'shadow@aniworld.io',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  createdAt: new Date().toISOString(),
  preferences: {
    autoPlayNext: true,
    defaultQuality: '1080p',
    subOrDub: 'sub',
  },
};

export function getUserProfile(): UserProfile {
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_USER;
  }
}

export function updateUserProfile(partial: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const updated = {
    ...current,
    ...partial,
    preferences: {
      ...current.preferences,
      ...(partial.preferences || {}),
    },
  };
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
  return updated;
}

export function getUserAudioPreference(): 'sub' | 'dub' {
  const saved = localStorage.getItem(STORAGE_KEYS.PREFERRED_AUDIO);
  return (saved === 'dub' ? 'dub' : 'sub');
}

export function setUserAudioPreference(preference: 'sub' | 'dub'): void {
  localStorage.setItem(STORAGE_KEYS.PREFERRED_AUDIO, preference);
}

let historySaveTimeout: any = null;

export function updateWatchProgress(
  anime: AnimeMedia,
  episodeNumber: number,
  currentTime: number,
  duration: number
): void {
  if (!anime || !anime.id) return;

  const history = getWatchHistory();
  const existingIdx = history.findIndex(
    (item) => item.animeId === anime.id && item.episodeNumber === episodeNumber
  );

  const title = anime.title?.english || anime.title?.romaji || 'Untitled Anime';
  const coverImage = anime.coverImage?.large || anime.coverImage?.medium || '';

  const progressItem: WatchProgress = {
    animeId: anime.id,
    title,
    coverImage,
    episodeNumber,
    currentTime,
    duration,
    lastWatched: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    history[existingIdx] = progressItem;
  } else {
    history.unshift(progressItem);
  }

  // Debounced write to storage to prevent frequent sync writes during video playback
  clearTimeout(historySaveTimeout);
  historySaveTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(history.slice(0, 50)));
  }, 2000);
}

export function getWatchHistory(): WatchProgress[] {
  const data = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export interface WatchlistItem {
  anime: AnimeMedia;
  category: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';
  addedAt: string;
}

export function getWatchlist(): WatchlistItem[] {
  const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getWatchlistItem(animeId: number): WatchlistItem | undefined {
  const list = getWatchlist();
  return list.find((item) => item.anime.id === animeId);
}

export function setWatchlistCategory(
  anime: AnimeMedia,
  category: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped'
): WatchlistItem[] {
  const list = getWatchlist();
  const idx = list.findIndex((item) => item.anime.id === anime.id);

  if (idx >= 0) {
    list[idx].category = category;
  } else {
    list.unshift({
      anime,
      category,
      addedAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
  return list;
}

export function removeFromWatchlist(animeId: number): WatchlistItem[] {
  const list = getWatchlist();
  const filtered = list.filter((item) => item.anime.id !== animeId);
  localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(filtered));
  return filtered;
}
