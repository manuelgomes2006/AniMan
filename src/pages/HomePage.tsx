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
  const [newEpisodes, setNewEpisodes] = useState<{ anime: AnimeMedia; episodeNumber: number }[]>([]);
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

    async function loadHomeData() {
      // 1. Instant non-blocking watch history load
      fetchWatchHistoryFromSupabase().then(historyData => {
        if (isSubscribed) setWatchHistory(historyData);
      });

      // 2. Trending Now (based on recent weekly/daily visit & viewing momentum: TRENDING_DESC)
      getTrendingAnime(1, 24).then(data => {
        if (isSubscribed) {
          setTrending(data);
          setLoading(false);
        }
      }).catch(() => {
        if (isSubscribed) setLoading(false);
      });

      // 3. Most Popular (based on total lifetime views/popularity: POPULARITY_DESC)
      getPopularAnime(1, 24).then(data => {
        if (isSubscribed) setPopular(data);
      });

      // 4. All Time Popular (based on highest overall rating: SCORE_DESC)
      getTopRatedAnime(1, 24).then(data => {
        if (isSubscribed) setTopRated(data);
      });

      // 5. Currently Airing Series (status: RELEASING)
      getCurrentlyAiringAnime(1, 24).then(data => {
        if (isSubscribed) setAiring(data);
      });

      // 6. New Episodes (airingSchedules sort: TIME_DESC live from AniList GraphQL)
      getRecentlyAiredEpisodes(1, 24).then(data => {
        if (isSubscribed) setNewEpisodes(data);
      });
    }

    loadHomeData();

    // Listen for real-time watch history updates
    const handleHistoryUpdate = () => {
      if (isSubscribed) loadHistory();
    };

    window.addEventListener('aniworld_history_updated', handleHistoryUpdate);

    return () => {
      isSubscribed = false;
      window.removeEventListener('aniworld_history_updated', handleHistoryUpdate);
    };
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans">
      {/* Personalized Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {getGreeting()}, <span className="text-purple-400">{username}</span> 👋
          </h1>
          <p className="text-xs text-slate-400 font-semibold">Ready for your next episode?</p>
        </div>
      </div>

      {/* Hero Carousel Banner */}
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

      {/* SECTION 2: Most Popular (Based on lifetime views & popularity) */}
      {popular.length > 0 && (
        <CarouselRow
          title="Most Popular"
          items={popular}
          icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
        />
      )}

      {/* SECTION 3: Trending Now (Based on recent weekly/daily visit & viewing momentum) */}
      {trending.length > 0 && (
        <CarouselRow
          title="Trending Now"
          items={trending}
          icon={<Flame className="w-4 h-4 text-purple-400 fill-purple-400" />}
        />
      )}

      {/* SECTION 4: New Episodes (Fetched live via AniList GraphQL airingSchedules sort: TIME_DESC) */}
      {newEpisodes.length > 0 && (
        <CarouselRow
          title="New Episodes"
          latestItems={newEpisodes}
          variant="latest"
          icon={<Sparkles className="w-4 h-4 text-purple-400" />}
          actionLink={
            <Link to="/browse?tab=latest" className="text-xs font-extrabold text-purple-400 hover:underline mr-2">
              View All →
            </Link>
          }
        />
      )}

      {/* SECTION 5: Currently Airing (Currently releasing anime series) */}
      {airing.length > 0 && (
        <CarouselRow
          title="Currently Airing"
          items={airing}
          icon={<Tv className="w-4 h-4 text-purple-400" />}
        />
      )}

      {/* SECTION 6: All Time Popular (Based on highest rating & score) */}
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
