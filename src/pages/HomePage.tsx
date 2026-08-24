import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getTrendingAnime,
  getPopularAnime,
  getTopRatedAnime,
  getCurrentlyAiringAnime
} from '../services/anilist/client';
import { getWatchHistory } from '../services/userStore';
import { AnimeMedia } from '../types/anime';
import { WatchProgress } from '../types/user';

import HeroCarousel from '../components/common/HeroCarousel';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import AnimeCard from '../components/common/AnimeCard';

import { Play, TrendingUp, Sparkles, Flame, Clock } from 'lucide-react';

export default function HomePage() {
  const [trending, setTrending] = useState<AnimeMedia[]>([]);
  const [popular, setPopular] = useState<AnimeMedia[]>([]);
  const [topRated, setTopRated] = useState<AnimeMedia[]>([]);
  const [airing, setAiring] = useState<AnimeMedia[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Parallel Query Execution Engine for 0ms Perception
  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);

      const historyData = getWatchHistory();
      setWatchHistory(historyData);

      const results = await Promise.allSettled([
        getTrendingAnime(1, 12),
        getPopularAnime(1, 12),
        getTopRatedAnime(1, 12),
        getCurrentlyAiringAnime(1, 12),
      ]);

      if (results[0].status === 'fulfilled') setTrending(results[0].value);
      if (results[1].status === 'fulfilled') setPopular(results[1].value);
      if (results[2].status === 'fulfilled') setTopRated(results[2].value);
      if (results[3].status === 'fulfilled') setAiring(results[3].value);

      setLoading(false);
    }
    loadHomeData();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* 1. Hero Carousel Container */}
      {loading ? (
        <SkeletonLoader type="hero" />
      ) : (
        trending.length > 0 && <HeroCarousel items={trending.slice(0, 5)} />
      )}

      {/* 2. Continue Watching Row (Supabase / Local Sync) */}
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
                    duration: hist.duration,
                    timeLeft: `${Math.max(1, Math.round((hist.duration - hist.currentTime) / 60))}m left`
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Trending Now Row */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-purple-400 fill-purple-400" />
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              Trending Now
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {trending.map((item) => (
            <AnimeCard key={item.id} anime={item} />
          ))}
        </div>
      </section>

      {/* 4. Latest Episodes Row */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              Latest Episodes
            </h2>
          </div>
          <Link to="/browse" className="text-xs font-extrabold text-purple-400 hover:underline">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {airing.slice(0, 12).map((item) => (
            <AnimeCard
              key={item.id}
              anime={item}
              variant="latest"
              episodeNumber={item.nextAiringEpisode?.episode ? item.nextAiringEpisode.episode - 1 : 12}
            />
          ))}
        </div>
      </section>

      {/* 5. Most Popular Row */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              Most Popular
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {popular.map((item) => (
            <AnimeCard key={item.id} anime={item} />
          ))}
        </div>
      </section>

      {/* 6. Top Rated Row */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              Top Rated Anime
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {topRated.map((item) => (
            <AnimeCard key={item.id} anime={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
