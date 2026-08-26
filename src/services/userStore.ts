import { WatchProgress, UserProfile } from '../types/user';
import { AnimeMedia } from '../types/anime';
import { supabase } from './auth/supabaseClient';
import { getAnimeDetails } from './anilist/client';

const STORAGE_KEYS = {
  USER: 'aniworld_user',
  WATCH_HISTORY: 'aniworld_watch_history',
  WATCHLIST: 'aniworld_watchlist',
  PREFERRED_AUDIO: 'aniworld_preferred_audio',
};

export function getUserProfile(): UserProfile {
  return {
    id: 'usr_guest_01',
    username: 'Manuel',
    email: 'manuel@aniworld.io',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    createdAt: new Date().toISOString(),
    preferences: {
      autoPlayNext: true,
      defaultQuality: '1080p',
      subOrDub: 'sub',
    },
  };
}

export function getUserAudioPreference(): 'sub' | 'dub' {
  const saved = localStorage.getItem(STORAGE_KEYS.PREFERRED_AUDIO);
  return saved === 'dub' ? 'dub' : 'sub';
}

export function setUserAudioPreference(preference: 'sub' | 'dub'): void {
  localStorage.setItem(STORAGE_KEYS.PREFERRED_AUDIO, preference);

  // Sync to Supabase Database
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      supabase.from('user_preferences').upsert({
        user_id: session.user.id,
        preferred_audio: preference,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }).then(({ error }) => {
        if (error) console.error('[Supabase Sync Audio Error]:', error.message);
      });
    }
  });
}

export async function syncAllUserPreferencesToSupabase(
  userId: string,
  prefs: {
    preferredAudio: 'sub' | 'dub';
    autoplay?: boolean;
    autoplayNext?: boolean;
    skipIntro?: boolean;
    skipOutro?: boolean;
  }
): Promise<boolean> {
  if (!userId) return false;

  const payload = {
    user_id: userId,
    preferred_audio: prefs.preferredAudio,
    autoplay: prefs.autoplay ?? true,
    autoplay_next: prefs.autoplayNext ?? true,
    skip_intro: prefs.skipIntro ?? false,
    skip_outro: prefs.skipOutro ?? false,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('user_preferences').upsert(payload, { onConflict: 'user_id' });
  if (error) {
    console.error('[UserPreferences Database Upsert Error]:', error.message);
    throw error;
  }
  return true;
}

let watchHistoryDebounceTimer: any = null;

/**
 * Update Watch Progress both in local cache and Supabase watch_history table
 */
export function updateWatchProgress(
  anime: AnimeMedia,
  episodeNumber: number,
  currentTime: number,
  duration: number
): void {
  if (!anime || !anime.id) return;

  const title = anime.title?.english || anime.title?.romaji || 'Untitled Anime';
  const coverImage = anime.coverImage?.large || anime.coverImage?.extraLarge || anime.coverImage?.medium || '';
  const completed = duration > 0 ? currentTime >= duration * 0.9 : false;

  const progressItem: WatchProgress = {
    animeId: anime.id,
    title,
    coverImage,
    episodeNumber,
    currentTime,
    duration,
    lastWatched: new Date().toISOString(),
  };

  // 1. Update Local Storage Cache
  const localHistory = getWatchHistory();
  const existingIdx = localHistory.findIndex(
    (item) => item.animeId === anime.id && item.episodeNumber === episodeNumber
  );

  if (existingIdx >= 0) {
    localHistory[existingIdx] = progressItem;
  } else {
    localHistory.unshift(progressItem);
  }

  localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(localHistory.slice(0, 50)));

  // 2. Debounced write to Supabase `watch_history` table
  clearTimeout(watchHistoryDebounceTimer);
  watchHistoryDebounceTimer = setTimeout(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('watch_history').upsert({
          user_id: session.user.id,
          anime_id: anime.id,
          episode_number: episodeNumber,
          current_time: currentTime,
          duration: duration,
          completed: completed,
          last_watched: new Date().toISOString()
        }, { onConflict: 'user_id,anime_id,episode_number' });
      }
    } catch (err) {
      console.warn('Watch history Supabase sync notice:', err);
    }
  }, 1500);
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

/**
 * Fetch Watch History from Supabase (Source of Truth) with Local & API Artwork Enrichment
 */
export async function fetchWatchHistoryFromSupabase(): Promise<WatchProgress[]> {
  const localHistory = getWatchHistory();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return localHistory;

    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('last_watched', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) return localHistory;

    const parsedPromises = data.map(async (item) => {
      const match = localHistory.find((l) => l.animeId === item.anime_id);
      let title = match?.title;
      let coverImage = match?.coverImage;

      // If missing from local cache, fetch metadata from AniList
      if (!title || !coverImage) {
        try {
          const details = await getAnimeDetails(item.anime_id);
          title = details.title?.english || details.title?.romaji || `Anime #${item.anime_id}`;
          coverImage = details.coverImage?.large || details.coverImage?.extraLarge || details.coverImage?.medium || '';
        } catch {
          title = `Anime #${item.anime_id}`;
          coverImage = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80';
        }
      }

      return {
        animeId: item.anime_id,
        title: title || `Anime #${item.anime_id}`,
        coverImage: coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80',
        episodeNumber: item.episode_number,
        currentTime: Number(item.current_time || 0),
        duration: Number(item.duration || 0),
        lastWatched: item.last_watched
      };
    });

    const parsed = await Promise.all(parsedPromises);
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(parsed));
    return parsed;
  } catch (err) {
    return localHistory;
  }
}

/**
 * Clear Watch History both locally and from Supabase database
 */
export async function clearWatchHistory(): Promise<void> {
  localStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('watch_history').delete().eq('user_id', session.user.id);
    }
  } catch (err) {
    console.warn('Clear watch history notice:', err);
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

export async function fetchWatchlistFromSupabase(): Promise<WatchlistItem[]> {
  const localList = getWatchlist();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return localList;

    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });

    if (error || !data) return localList;

    const enrichedPromises = data.map(async (row) => {
      const match = localList.find((l) => l.anime.id === row.anime_id);
      let anime = match?.anime;
      if (!anime) {
        try {
          anime = await getAnimeDetails(row.anime_id);
        } catch {
          anime = {
            id: row.anime_id,
            title: { english: `Anime #${row.anime_id}`, romaji: `Anime #${row.anime_id}` },
            coverImage: { large: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80' },
          } as any;
        }
      }
      return {
        anime,
        category: row.status,
        addedAt: row.added_at || row.updated_at
      } as WatchlistItem;
    });

    const enriched = await Promise.all(enrichedPromises);
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(enriched));
    window.dispatchEvent(new Event('aniworld_watchlist_updated'));
    return enriched;
  } catch (err) {
    return localList;
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

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      supabase.from('watchlist').upsert({
        user_id: session.user.id,
        anime_id: anime.id,
        status: category,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,anime_id' }).then(({ error }) => {
        if (error) console.error('Watchlist Supabase sync error:', error);
      });
    }
  });

  return list;
}

export function addToWatchlist(
  anime: AnimeMedia,
  category: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped' = 'watching'
): WatchlistItem[] {
  return setWatchlistCategory(anime, category);
}

export function removeFromWatchlist(animeId: number): WatchlistItem[] {
  const list = getWatchlist();
  const filtered = list.filter((item) => item.anime.id !== animeId);
  localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(filtered));

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      supabase.from('watchlist').delete().eq('user_id', session.user.id).eq('anime_id', animeId).then(({ error }) => {
        if (error) console.error('Watchlist delete error:', error);
      });
    }
  });

  return filtered;
}
