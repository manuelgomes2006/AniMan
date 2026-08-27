import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getTrendingAnime,
  getPopularAnime,
  getTopRatedAnime,
  getCurrentlyAiringAnime,
  getRecentlyAiredEpisodes
} from '../services/anilist/client';
import { fetchWatchHistoryFromSupabase, getWatchHistory } from '../services/userStore';
import { AnimeMedia } from '../types/anime';
import { WatchProgress } from '../types/user';

import HeroCarousel from '../components/common/HeroCarousel';
import CarouselRow from '../components/common/CarouselRow';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import AnimeCard from '../components/common/AnimeCard';

import { TrendingUp, Sparkles, Flame, Clock, Tv, Star, Radio } from 'lucide-react';

export default function HomePage() {
  const { profile, user } = useAuth();
  const [trending, setTrending] = useState<AnimeMedia[]>([]);
  const [popular, setPopular] = useState<AnimeMedia[]>([]);
  const [topRated, setTopRated] = useState<AnimeMedia[]>([]);
  const [airing, setAiring] = useState<AnimeMedia[]>([]);
  
  // Persistent 0ms initial state for New Episodes from localStorage cache
  const [newEpisodes, setNewEpisodes] = useState<AnimeMedia[]>(() => {
    try {
      const cached = localStorage.getItem('aniworld_new_episodes');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Persistent 0ms initial state for Continue Watching from local storage
  const [watchHistory, setWatchHistory] = useState<WatchProgress[]>(() => {
    return getWatchHistory();
  });

  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const username = profile?.displayName || profile?.username || 'Member';

  const loadHistory = () => {
    // 1. Read local history immediately
    const local = getWatchHistory();
    if (local && local.length > 0) {
      setWatchHistory(local);
    }

    // 2. Fetch cloud history from Supabase DB
    fetchWatchHistoryFromSupabase().then(historyData => {
      if (historyData && historyData.length > 0) {
        setWatchHistory(historyData);
      } else if (local && local.length > 0) {
        setWatchHistory(local);
      }
    }).catch(() => {
      setWatchHistory(getWatchHistory());
    });
  };

  useEffect(() => {
    let isSubscribed = true;

    // Fetch live aired episodes (bypassing 30m stale cache lock on 60s auto-checks for true live updates)
    const loadNewEpisodesData = (forceRefresh = false) => {
      getRecentlyAiredEpisodes(24, forceRefresh).then(latestReleasedList => {
        if (!isSubscribed) return;

        if (latestReleasedList && latestReleasedList.length > 0) {
          setNewEpisodes(latestReleasedList);
          try {
            localStorage.setItem('aniworld_new_episodes', JSON.stringify(latestReleasedList));
          } catch {}
        }
      }).catch(err => console.warn('Schedule load error for new episodes:', err));
    };

    async function loadHomeData() {
      // 1. Instant non-blocking watch history load
      loadHistory();

      // 2. Fetch Live Airing Schedule for "New Episodes" tab
      loadNewEpisodesData(false);

      // 3. Trending Now: Recent visits in present day/week (sort: TRENDING_DESC)
      getTrendingAnime(1, 24).then(data => {
        if (isSubscribed) {
          setTrending(data);
          setLoading(false);
        }
      }).catch(() => {
        if (isSubscribed) setLoading(false);
      });

      // 4. Most Popular: Total lifetime views & popularity (sort: POPULARITY_DESC)
      getPopularAnime(1, 24).then(data => {
        if (isSubscribed) setPopular(data);
      });

      // 5. All Time Popular: Rated based on average user score (sort: SCORE_DESC)
      getTopRatedAnime(1, 24).then(data => {
        if (isSubscribed) setTopRated(data);
      });

      // 6. Currently Airing: Popular releasing series of current active season
      getCurrentlyAiringAnime(1, 24).then(data => {
        if (isSubscribed) {
          setAiring(data);
        }
      });
    }

    loadHomeData();

    // Auto-refresh released schedule data every 60s with forceRefresh=true so newly launched episodes pop up live!
    const scheduleTimer = setInterval(() => {
      loadNewEpisodesData(true);
    }, 60000);

    // Lightweight 5s cross-device poll timer when user is logged in
    const crossDeviceTimer = setInterval(() => {
      if (user) loadHistory();
    }, 5000);

    // Listen for real-time watch history updates and profile auth changes
    const handleHistoryUpdate = () => {
      if (isSubscribed) loadHistory();
    };

    window.addEventListener('aniworld_history_updated', handleHistoryUpdate);
    window.addEventListener('aniworld_profile_updated', handleHistoryUpdate);
    window.addEventListener('focus', handleHistoryUpdate);

    return () => {
      isSubscribed = false;
      clearInterval(scheduleTimer);
      clearInterval(crossDeviceTimer);
      window.removeEventListener('aniworld_history_updated', handleHistoryUpdate);
      window.removeEventListener('aniworld_profile_updated', handleHistoryUpdate);
      window.removeEventListener('focus', handleHistoryUpdate);
    };
  }, [user]);

  const latestEpisodesList = newEpisodes.length > 0 ? newEpisodes : airing;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans">
      {/* 1. Personalized Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {getGreeting()}, <span className="text-purple-400">{username}</span> 👋
          </h1>
          <p className="text-xs text-slate-400 font-semibold">Ready for your next episode?</p>
        </div>
      </div>

      {/* 2. Hero Carousel Banner */}
      {loading ? (
        <SkeletonLoader type="hero" />
      ) : (
        trending.length > 0 && <HeroCarousel items={trending.slice(0, 5)} />
      )}

      {/* SECTION 1: Continue Watching (Mobile Horizontal Scrollable Carousel + Desktop Grid) */}
      {watchHistory.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                Continue Watching
              </h2>
            </div>
          </div>

          <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-x-auto sm:overflow-visible scrollbar-none pb-2 sm:pb-0">
            {watchHistory.slice(0, 6).map((hist) => {
              const dummyAnime: AnimeMedia = {
                id: hist.animeId,
                title: { romaji: hist.title, english: hist.title },
                coverImage: { large: hist.coverImage, extraLarge: hist.coverImage, medium: hist.coverImage }
              };

              return (
                <div key={`${hist.animeId}-${hist.episodeNumber}`} className="w-[260px] sm:w-auto shrink-0">
                  <AnimeCard
                    anime={dummyAnime}
                    variant="progress"
                    progressData={{
                      episodeNumber: hist.episodeNumber,
                      currentTime: hist.currentTime,
                      duration: hist.duration
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2: Most Popular (Lifetime total views & popularity) */}
      {popular.length > 0 && (
        <CarouselRow
          title="Most Popular"
          items={popular}
          icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
        />
      )}

      {/* SECTION 3: Trending Now (Total views/visits in present day, yesterday & past week) */}
      {trending.length > 0 && (
        <CarouselRow
          title="Trending Now"
          items={trending}
          icon={<Flame className="w-4 h-4 text-purple-400 fill-purple-400" />}
        />
      )}

      {/* SECTION 4: New Episodes (Broadcast Schedule Feed with Cache Bypass & 60s Live Auto-Refresh) */}
      {latestEpisodesList.length > 0 && (
        <CarouselRow
          title="New Episodes"
          items={latestEpisodesList}
          variant="latest"
          icon={<Sparkles className="w-4 h-4 text-purple-400" />}
          actionLink={
            <Link to="/browse?tab=latest" className="text-xs font-extrabold text-purple-400 hover:underline mr-2">
              View All →
            </Link>
          }
        />
      )}

      {/* SECTION 5: Currently Airing (Popular Anime of the Current Active Season) */}
      {airing.length > 0 && (
        <CarouselRow
          title="Currently Airing"
          items={airing}
          icon={<Tv className="w-4 h-4 text-purple-400" />}
        />
      )}

      {/* SECTION 6: All Time Popular (Highest rated anime based on user score) */}
      {topRated.length > 0 && (
        <CarouselRow
          title="All Time Popular"
          items={topRated}
          icon={<Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
        />
      )}
    </div>
  );
}
