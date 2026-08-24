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
import CarouselRow from '../components/common/CarouselRow';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import AnimeCard from '../components/common/AnimeCard';

import { TrendingUp, Sparkles, Flame, Clock } from 'lucide-react';

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
        getTrendingAnime(1, 24),
        getPopularAnime(1, 24),
        getTopRatedAnime(1, 24),
        getCurrentlyAiringAnime(1, 24),
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

      {/* 3. Trending Now Horizontally Scrollable Carousel */}
      <CarouselRow
        title="Trending Now"
        items={trending}
        icon={<Flame className="w-4 h-4 text-purple-400 fill-purple-400" />}
      />

      {/* 4. Latest Episodes Horizontally Scrollable Carousel */}
      <CarouselRow
        title="Latest Episodes"
        items={airing}
        variant="latest"
        icon={<Sparkles className="w-4 h-4 text-purple-400" />}
        actionLink={
          <Link to="/browse" className="text-xs font-extrabold text-purple-400 hover:underline mr-2">
            View All →
          </Link>
        }
      />

      {/* 5. Most Popular Horizontally Scrollable Carousel */}
      <CarouselRow
        title="Most Popular"
        items={popular}
        icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
      />

      {/* 6. Top Rated Horizontally Scrollable Carousel */}
      <CarouselRow
        title="Top Rated Anime"
        items={topRated}
        icon={<Sparkles className="w-4 h-4 text-purple-400" />}
      />
    </div>
  );
}
