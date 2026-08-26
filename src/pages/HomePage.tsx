import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getTrendingAnime,
  getPopularAnime,
  getTopRatedAnime,
  getCurrentlyAiringAnime,
  getAiringSchedule
} from '../services/anilist/client';
import { fetchWatchHistoryFromSupabase } from '../services/userStore';
import { AnimeMedia } from '../types/anime';
import { WatchProgress } from '../types/user';

import HeroCarousel from '../components/common/HeroCarousel';
import CarouselRow from '../components/common/CarouselRow';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import AnimeCard from '../components/common/AnimeCard';

import { TrendingUp, Sparkles, Flame, Clock, Tv, Star } from 'lucide-react';

export default function HomePage() {
  const { profile } = useAuth();
  const [trending, setTrending] = useState<AnimeMedia[]>([]);
  const [popular, setPopular] = useState<AnimeMedia[]>([]);
  const [topRated, setTopRated] = useState<AnimeMedia[]>([]);
  const [airing, setAiring] = useState<AnimeMedia[]>([]);
  const [newEpisodes, setNewEpisodes] = useState<AnimeMedia[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const username = profile?.displayName || profile?.username || 'Member';

  const loadHistory = () => {
    fetchWatchHistoryFromSupabase().then(historyData => {
      setWatchHistory(historyData);
    });
  };

  useEffect(() => {
    let isSubscribed = true;

    // Load schedule data taking anime that is coming out or has already aired for "New Episodes"
    const loadNewEpisodesData = () => {
      const nowSecs = Math.floor(Date.now() / 1000);
      const startOfWeek = nowSecs - 7 * 86400;
      const endOfWeek = nowSecs + 7 * 86400;

      getAiringSchedule(startOfWeek, endOfWeek).then(scheduleItems => {
        if (!isSubscribed) return;

        // Take all valid schedule items (both already aired and coming out)
        // Sort descending by airingAt so the most recent and upcoming releases are featured
        const sortedItems = scheduleItems
          .filter(item => item && item.media)
          .sort((a, b) => b.airingAt - a.airingAt);

        const uniqueAnimeMap = new Map<number, AnimeMedia>();
        sortedItems.forEach(item => {
          if (!uniqueAnimeMap.has(item.media.id)) {
            uniqueAnimeMap.set(item.media.id, {
              ...item.media,
              latestEpisodeNumber: item.episode
            });
          }
        });

        const latestReleasedList = Array.from(uniqueAnimeMap.values());
        if (latestReleasedList.length > 0) {
          setNewEpisodes(latestReleasedList);
        }
      }).catch(err => console.warn('Schedule load error for new episodes:', err));
    };

    async function loadHomeData() {
      // 1. Instant non-blocking watch history load
      fetchWatchHistoryFromSupabase().then(historyData => {
        if (isSubscribed) setWatchHistory(historyData);
      });

      // 2. Fetch Live Airing Schedule for "New Episodes" tab
      loadNewEpisodesData();

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

    // Auto-refresh released schedule data every 60s so newly launched episodes pop up live!
    const scheduleTimer = setInterval(loadNewEpisodesData, 60000);

    // Listen for real-time watch history updates
    const handleHistoryUpdate = () => {
      if (isSubscribed) loadHistory();
    };

    window.addEventListener('aniworld_history_updated', handleHistoryUpdate);

    return () => {
      isSubscribed = false;
      clearInterval(scheduleTimer);
      window.removeEventListener('aniworld_history_updated', handleHistoryUpdate);
    };
  }, []);

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

      {/* SECTION 1: Continue Watching */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {watchHistory.slice(0, 4).map((hist) => {
              const dummyAnime: AnimeMedia = {
                id: hist.animeId,
                title: { romaji: hist.title, english: hist.title },
                coverImage: { large: hist.coverImage, extraLarge: hist.coverImage, medium: hist.coverImage }
              };

              return (
                <AnimeCard
                  key={`${hist.animeId}-${hist.episodeNumber}`}
                  anime={dummyAnime}
                  variant="progress"
                  progressData={{
                    episodeNumber: hist.episodeNumber,
                    currentTime: hist.currentTime,
                    duration: hist.duration
                  }}
                />
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

      {/* SECTION 4: New Episodes (Strictly Released Episode Numbers Sorted by Most Recent Airing) */}
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
