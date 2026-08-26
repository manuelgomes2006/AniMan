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
  return saved?.toLowerCase() === 'dub' ? 'dub' : 'sub';
}

export function setUserAudioPreference(preference: 'sub' | 'dub'): void {
  const audioChoice = preference === 'dub' ? 'dub' : 'sub';
  localStorage.setItem(STORAGE_KEYS.PREFERRED_AUDIO, audioChoice);

  // Sync to Supabase Database & Auth User Metadata
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      supabase.from('user_preferences').upsert({
        user_id: session.user.id,
        preferred_audio: audioChoice,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }).then(({ error }) => {
        if (error) console.error('[Supabase Sync Audio Error]:', error.message);
      });

      supabase.auth.updateUser({
        data: { preferred_audio: audioChoice }
      }).catch(() => {});
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

  const audioChoice = prefs.preferredAudio === 'dub' ? 'dub' : 'sub';

  // 1. Persist to local player cache immediately
  localStorage.setItem(STORAGE_KEYS.PREFERRED_AUDIO, audioChoice);

  // 2. Persist to Supabase Database user_preferences table
  const payload = {
    user_id: userId,
    preferred_audio: audioChoice,
    autoplay: prefs.autoplay ?? true,
    autoplay_next: prefs.autoplayNext ?? true,
    skip_intro: prefs.skipIntro ?? false,
    skip_outro: prefs.skipOutro ?? false,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('user_preferences').upsert(payload, { onConflict: 'user_id' });
  if (error) {
    console.error('[UserPreferences Database Upsert Error]:', error.message);
  }

  // 3. Persist to Supabase Auth User Metadata for multi-layer fail-safe
  await supabase.auth.updateUser({
    data: {
      preferred_audio: audioChoice,
      autoplay: prefs.autoplay ?? true,
      autoplay_next: prefs.autoplayNext ?? true,
      skip_intro: prefs.skipIntro ?? false,
      skip_outro: prefs.skipOutro ?? false,
    }
  }).catch(() => {});

  return true;
}

let watchHistoryDebounceTimer: any = null;

/**
 * Update Watch Progress both in local cache and Supabase watch_history table
 * Ensures 1 entry per anime with accurate episode number, time progress & timeline
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
  const roundedCurrent = Math.round(currentTime);
  const roundedDuration = Math.round(duration || 1440);
  const completed = roundedDuration > 0 ? roundedCurrent >= roundedDuration * 0.9 : false;

  const progressItem: WatchProgress = {
    animeId: anime.id,
    title,
    coverImage,
    episodeNumber,
    currentTime: roundedCurrent,
    duration: roundedDuration,
    lastWatched: new Date().toISOString(),
  };

  // 1. Update Local Storage Cache - replace existing entry for this anime & bring to top
  const localHistory = getWatchHistory();
  const existingIdx = localHistory.findIndex(
    (item) => item.animeId === anime.id
  );

  if (existingIdx >= 0) {
    localHistory.splice(existingIdx, 1);
  }
  localHistory.unshift(progressItem);

  localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(localHistory.slice(0, 50)));

  // Dispatch real-time event for instant UI update across components
  window.dispatchEvent(new CustomEvent('aniworld_history_updated'));

  // 2. Debounced write to Supabase `watch_history` table
  clearTimeout(watchHistoryDebounceTimer);
  watchHistoryDebounceTimer = setTimeout(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const payload = {
          user_id: session.user.id,
          anime_id: String(anime.id),
          episode_number: episodeNumber,
          current_time: roundedCurrent,
          duration: roundedDuration,
          completed: completed,
          last_watched: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('watch_history')
          .upsert(payload, { onConflict: 'user_id,anime_id' });

        if (error) {
          console.error('[WatchHistory Supabase Upsert Error]:', error.message);
        }
      }
    } catch (err) {
      console.warn('Watch history Supabase sync notice:', err);
    }
  }, 1000);
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
      .select('user_id, anime_id, episode_number, current_time, duration, last_watched, updated_at')
      .eq('user_id', session.user.id)
      .order('last_watched', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) return localHistory;

    const parsedPromises = data.map(async (item) => {
      const animeIdNum = Number(item.anime_id);
      const match = localHistory.find((l) => l.animeId === animeIdNum);
      let title = match?.title;
      let coverImage = match?.coverImage;

      // If missing from local cache, fetch metadata from AniList
      if (!title || !coverImage) {
        try {
          const details = await getAnimeDetails(animeIdNum);
          title = details.title?.english || details.title?.romaji || `Anime #${animeIdNum}`;
          coverImage = details.coverImage?.large || details.coverImage?.extraLarge || details.coverImage?.medium || '';
        } catch {
          title = `Anime #${animeIdNum}`;
          coverImage = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80';
        }
      }

      const epNum = Number(item.episode_number || 1);
      const curTime = Number(item.current_time || 0);
      const durTime = Number(item.duration || 1440);

      return {
        animeId: animeIdNum,
        title: title || `Anime #${animeIdNum}`,
        coverImage: coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80',
        episodeNumber: epNum,
        currentTime: curTime,
        duration: durTime,
        lastWatched: item.last_watched || item.updated_at || new Date().toISOString()
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
