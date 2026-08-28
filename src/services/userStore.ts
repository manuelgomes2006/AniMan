import { WatchProgress, UserProfile } from '../types/user';
import { AnimeMedia } from '../types/anime';
import { supabase } from './auth/supabaseClient';
import { getAnimeDetails } from './anilist/client';

const STORAGE_KEYS = {
  USER: 'animan_user',
  WATCH_HISTORY: 'animan_watch_history',
  WATCHLIST: 'animan_watchlist',
  PREFERRED_AUDIO: 'animan_preferred_audio',
};

export function getUserProfile(): UserProfile {
  return {
    id: 'usr_guest_01',
    username: 'Manuel',
    email: 'manuel@animan.io',
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
 * Update Watch Progress — Saves watch history directly to Supabase tied to auth.users.id
 * Uses upsert with UNIQUE(user_id, anime_id, episode_id) constraint to prevent duplicate rows
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

  const validDuration = duration && duration > 60 ? Math.round(duration) : 1430;
  const validCurrentTime = Math.min(validDuration, Math.max(0, Math.round(currentTime)));
  const completed = validDuration > 0 ? validCurrentTime >= validDuration * 0.9 : false;

  const progressItem: WatchProgress = {
    animeId: anime.id,
    title,
    coverImage,
    episodeNumber,
    currentTime: validCurrentTime,
    duration: validDuration,
    lastWatched: new Date().toISOString(),
  };

  // 1. Update Local Storage Cache as temporary fallback
  const localHistory = getWatchHistory();
  const filteredHistory = localHistory.filter((item) => item.animeId !== anime.id);
  filteredHistory.unshift(progressItem);
  localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(filteredHistory.slice(0, 50)));

  // Notify local components immediately
  window.dispatchEvent(new CustomEvent('aniworld_history_updated'));

  // 2. Debounced write to Supabase `watch_history` table
  clearTimeout(watchHistoryDebounceTimer);
  watchHistoryDebounceTimer = setTimeout(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        console.warn('[WatchProgress Save Notice] No active authenticated Supabase user session.');
        return;
      }

      console.log(`[AUTH USER ID: ${user.id}] Saving progress: Anime #${anime.id}, Ep ${episodeNumber}, ${validCurrentTime}s/${validDuration}s`);

      const basePayload = {
        user_id: user.id,
        anime_id: String(anime.id),
        episode_id: `${anime.id}-${episodeNumber}`,
        episode_number: episodeNumber,
        progress_seconds: validCurrentTime,
        duration_seconds: validDuration,
        completed: completed,
        updated_at: new Date().toISOString()
      };

      // Try upserting full payload with title and cover_image
      const { error: primaryErr } = await supabase.from('watch_history').upsert({
        ...basePayload,
        title,
        cover_image: coverImage
      }, { onConflict: 'user_id,anime_id,episode_id' });

      if (primaryErr) {
        console.warn('[WatchHistory Upsert Notice] Primary upsert warning:', primaryErr.message);
        // Fallback to strict standard schema payload if title/cover_image columns are absent
        const { error: fallbackErr } = await supabase.from('watch_history').upsert(basePayload, {
          onConflict: 'user_id,anime_id,episode_id'
        });
        if (fallbackErr) {
          console.error('[WatchHistory Upsert Error] Failed to save watch progress to Supabase:', fallbackErr.message);
          return;
        }
      }

      // Send instant cross-device WebSocket Broadcast signal to PC / Tablet / Phone
      supabase.channel(`realtime-user-sync-${user.id}`).send({
        type: 'broadcast',
        event: 'watch_history_signal',
        payload: progressItem
      }).catch(() => {});

      window.dispatchEvent(new CustomEvent('aniworld_history_updated'));
    } catch (err) {
      console.error('[WatchHistory Upsert Exception]:', err);
    }
  }, 400);
}

import { isAllowedAnime, filterAllowedAnimeList } from './catalog/contentFilter';

export function getWatchHistory(): WatchProgress[] {
  const data = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY) || localStorage.getItem('aniworld_watch_history');
  if (!data) return [];
  try {
    const parsed: WatchProgress[] = JSON.parse(data);
    return filterAllowedAnimeList(parsed);
  } catch {
    return [];
  }
}

/**
 * Automatic One-Time Migration of Local Watch History to Supabase Cloud
 */
export async function migrateLocalWatchHistoryToSupabase(userId: string): Promise<void> {
  if (!userId || !supabase) return;

  const localHistory = getWatchHistory();
  if (!localHistory || localHistory.length === 0) return;

  const migrationKey = `aniworld_migrated_history_${userId}`;
  if (localStorage.getItem(migrationKey)) return;

  try {
    console.log(`[WatchHistory Migration] Migrating ${localHistory.length} local items to Supabase for User: ${userId}`);

    for (const item of localHistory) {
      if (!item.animeId) continue;
      const basePayload = {
        user_id: userId,
        anime_id: String(item.animeId),
        episode_id: `${item.animeId}-${item.episodeNumber || 1}`,
        episode_number: item.episodeNumber || 1,
        progress_seconds: item.currentTime || 0,
        duration_seconds: item.duration || 1430,
        completed: (item.duration && item.duration > 0) ? (item.currentTime >= item.duration * 0.9) : false,
        updated_at: item.lastWatched || new Date().toISOString()
      };

      const { error: primaryErr } = await supabase.from('watch_history').upsert({
        ...basePayload,
        title: item.title,
        cover_image: item.coverImage
      }, { onConflict: 'user_id,anime_id,episode_id' });

      if (primaryErr) {
        await supabase.from('watch_history').upsert(basePayload, {
          onConflict: 'user_id,anime_id,episode_id'
        }).catch(() => {});
      }
    }

    localStorage.setItem(migrationKey, 'true');
    console.log('[WatchHistory Migration] Successfully completed migration to Supabase Cloud.');
  } catch (err) {
    console.warn('[WatchHistory Migration Notice]:', err);
  }
}

/**
 * Fetch Watch History from Supabase (Source of Truth for authenticated users)
 * Queries watch_history table filtered strictly by auth.users.id
 */
export async function fetchWatchHistoryFromSupabase(): Promise<WatchProgress[]> {
  const localHistory = getWatchHistory();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      console.log('[WatchHistory Fetch] Unauthenticated session; returning local cache.');
      return localHistory;
    }

    console.log(`[AUTH USER ID: ${user.id}] Fetching watch progress from Supabase Cloud...`);

    // Perform one-time migration of local history to cloud if needed
    migrateLocalWatchHistoryToSupabase(user.id);

    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[WatchHistory Fetch Error] Supabase query error:', error.message);
      return localHistory;
    }

    if (!data || data.length === 0) {
      console.log(`[AUTH USER ID: ${user.id}] No watch records in Supabase Cloud yet.`);
      return localHistory;
    }

    // Group rows by anime_id to handle multi-episode records
    const animeGroups = new Map<number, any[]>();
    data.forEach((row) => {
      const aid = Number(row.anime_id);
      if (!isNaN(aid)) {
        if (!animeGroups.has(aid)) {
          animeGroups.set(aid, []);
        }
        animeGroups.get(aid)!.push(row);
      }
    });

    // Pick the most recent record per anime series
    const uniqueRows: any[] = [];
    animeGroups.forEach((rows) => {
      rows.sort((a, b) => {
        const timeA = new Date(a.updated_at || 0).getTime();
        const timeB = new Date(b.updated_at || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        const epA = Number(a.episode_number || 1);
        const epB = Number(b.episode_number || 1);
        return epB - epA;
      });
      uniqueRows.push(rows[0]);
    });

    // Parse records into application format
    const parsedPromises = uniqueRows.map(async (item) => {
      const aid = Number(item.anime_id);
      const match = localHistory.find((l) => l.animeId === aid);

      let title = item.title || item.anime_title || match?.title;
      let coverImage = item.cover_image || item.cover_url || item.coverImage || match?.coverImage;

      // Fallback details if missing
      if (!title || !coverImage) {
        try {
          const details = await getAnimeDetails(aid);
          title = details.title?.english || details.title?.romaji || `Anime #${aid}`;
          coverImage = details.coverImage?.large || details.coverImage?.extraLarge || details.coverImage?.medium || '';
        } catch {
          title = `Anime #${aid}`;
          coverImage = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80';
        }
      }

      const epNum = Number(item.episode_number || 1);
      const curTime = Number(item.progress_seconds || item.current_time || 0);
      const rawDur = Number(item.duration_seconds || item.duration || 0);
      const durTime = rawDur && rawDur > 60 ? rawDur : 1430;
      const validCurTime = Math.min(durTime, Math.max(0, curTime));

      return {
        animeId: aid,
        title: title || `Anime #${aid}`,
        coverImage: coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80',
        episodeNumber: epNum,
        currentTime: validCurTime,
        duration: durTime,
        lastWatched: item.updated_at || new Date().toISOString()
      };
    });

    const parsed = await Promise.all(parsedPromises);
    const allowedParsed = filterAllowedAnimeList(parsed);
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(allowedParsed));
    return allowedParsed;
  } catch (err) {
    console.error('[WatchHistory Fetch Exception]:', err);
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
      const { error } = await supabase.from('watch_history').delete().eq('user_id', session.user.id);
      if (error) {
        console.error('[ClearWatchHistory Error]:', error.message);
      }
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
  const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST) || localStorage.getItem('aniworld_watchlist');
  if (!data) return [];
  try {
    const parsed: WatchlistItem[] = JSON.parse(data);
    return filterAllowedAnimeList(parsed);
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

    if (error) {
      console.error('[Watchlist Fetch Error]:', error.message);
      return localList;
    }

    if (!data) return localList;

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
    const allowedEnriched = filterAllowedAnimeList(enriched);
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(allowedEnriched));
    window.dispatchEvent(new Event('aniworld_watchlist_updated'));
    return allowedEnriched;
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
        if (error) console.error('Watchlist Supabase sync error:', error.message);
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
        if (error) console.error('Watchlist delete error:', error.message);
      });
    }
  });

  return filtered;
}
