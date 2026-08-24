import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getTrendingAnime, getPopularAnime, getTopRatedAnime,
  getCurrentlyAiringAnime, searchAnime, ANIME_GENRES
} from '../services/anilist/client';
import { getWatchHistory } from '../services/userStore';
import { AnimeMedia } from '../types/anime';
import { WatchProgress } from '../types/user';
import HeroCarousel from '../components/common/HeroCarousel';
import AnimeCard from '../components/common/AnimeCard';
import { Flame, Sparkles, Trophy, Clock, Filter, Loader2, Play } from 'lucide-react';

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const selectedGenre = searchParams.get('genre') || 'All';

  const [trending, setTrending] = useState<AnimeMedia[]>([]);
  const [popular, setPopular] = useState<AnimeMedia[]>([]);
  const [topRated, setTopRated] = useState<AnimeMedia[]>([]);
  const [airing, setAiring] = useState<AnimeMedia[]>([]);
  const [searchResults, setSearchResults] = useState<AnimeMedia[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);
      try {
        const [trendingData, popularData, topRatedData, airingData] = await Promise.all([
          getTrendingAnime(1, 10),
          getPopularAnime(1, 12),
          getTopRatedAnime(1, 12),
          getCurrentlyAiringAnime(1, 12)
        ]);

        setTrending(trendingData);
        setPopular(popularData);
        setTopRated(topRatedData);
        setAiring(airingData);
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  useEffect(() => {
    setContinueWatching(getWatchHistory().slice(0, 6));
  }, []);

  useEffect(() => {
    if (searchQuery || selectedGenre !== 'All') {
      async function executeSearch() {
        setSearchLoading(true);
        try {
          const res = await searchAnime({ search: searchQuery, genre: selectedGenre, perPage: 24 });
          setSearchResults(res.media || []);
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setSearchLoading(false);
        }
      }
      executeSearch();
    }
  }, [searchQuery, selectedGenre]);

  const handleGenreChange = (genre: string) => {
    const params = new URLSearchParams(searchParams);
    if (genre === 'All') {
      params.delete('genre');
    } else {
      params.set('genre', genre);
    }
    setSearchParams(params);
  };

  const isSearchOrFilterActive = Boolean(searchQuery || selectedGenre !== 'All');

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {/* Featured Spotlight Hero Banner (Mockup 1 style) */}
      {!isSearchOrFilterActive && !loading && trending.length > 0 && (
        <HeroCarousel items={trending} />
      )}

      {/* Genre Filter Scroll Bar */}
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center gap-2 text-slate-300 font-bold text-xs sm:text-sm">
          <Filter className="w-4 h-4 text-purple-400" />
          <span>Quick Genre Filter</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {['All', ...ANIME_GENRES].map((genre) => (
            <button
              key={genre}
              onClick={() => handleGenreChange(genre)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedGenre === genre || (genre === 'All' && selectedGenre === 'All')
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-950'
                  : 'bg-[#0D0D12] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-900'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Filter / Search Active Grid */}
      {isSearchOrFilterActive ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              {searchQuery ? `Results for "${searchQuery}"` : `${selectedGenre} Anime`}
            </h2>
            <button
              onClick={() => setSearchParams({})}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              Clear Filters
            </button>
          </div>

          {searchLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
              {searchResults.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#0D0D12] rounded-3xl border border-slate-900">
              <p className="text-slate-400 font-medium text-sm">No anime found matching your filter.</p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Row 1: Trending Now (Horizontal Swipeable Carousel on Mobile matching Mockup 1) */}
          <section className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-1 h-5 bg-purple-500 rounded-full inline-block md:hidden" />
                <Flame className="w-5 h-5 text-purple-400 fill-purple-400/20 hidden md:inline-block" />
                Trending Now
              </h2>
              <span className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer">
                View All ›
              </span>
            </div>

            {loading ? (
              <div className="flex gap-3 overflow-x-auto">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-36 aspect-[3/4] bg-[#0D0D12] rounded-2xl animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6 overflow-x-auto pb-2 scrollbar-none snap-x">
                {trending.slice(0, 12).map((anime) => (
                  <div key={anime.id} className="w-36 sm:w-auto shrink-0 snap-start">
                    <AnimeCard anime={anime} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Row 2: Continue Watching (Vertical Stacked Cards matching Mockup 1) */}
          {continueWatching.length > 0 && (
            <section className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                  <span className="w-1 h-5 bg-purple-500 rounded-full inline-block md:hidden" />
                  <Clock className="w-5 h-5 text-purple-400 hidden md:inline-block" />
                  Continue Watching
                </h2>
                <span className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer">
                  View All ›
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {continueWatching.map((item) => {
                  const media: AnimeMedia = {
                    id: item.animeId,
                    title: { english: item.title, romaji: item.title },
                    coverImage: { extraLarge: item.coverImage, large: item.coverImage }
                  };
                  return (
                    <AnimeCard
                      key={`${item.animeId}-${item.episodeNumber}`}
                      anime={media}
                      variant="progress"
                      progressData={{
                        episodeNumber: item.episodeNumber,
                        currentTime: item.currentTime,
                        duration: item.duration,
                        timeLeft: `${Math.max(1, Math.round((item.duration - item.currentTime) / 60))}m left`
                      }}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Row 3: Popular This Week (Horizontal Swipeable Carousel on Mobile matching Mockup 1) */}
          <section className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-1 h-5 bg-purple-500 rounded-full inline-block md:hidden" />
                <Sparkles className="w-5 h-5 text-amber-400 hidden md:inline-block" />
                Popular This Week
              </h2>
              <span className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer">
                View All ›
              </span>
            </div>

            {loading ? (
              <div className="flex gap-3 overflow-x-auto">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-36 aspect-[3/4] bg-[#0D0D12] rounded-2xl animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6 overflow-x-auto pb-2 scrollbar-none snap-x">
                {popular.map((anime) => (
                  <div key={anime.id} className="w-36 sm:w-auto shrink-0 snap-start">
                    <AnimeCard anime={anime} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Row 4: Currently Airing */}
          <section className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-1 h-5 bg-purple-500 rounded-full inline-block md:hidden" />
                <Play className="w-5 h-5 text-emerald-400 fill-emerald-400/20 hidden md:inline-block" />
                Currently Airing Seasons
              </h2>
            </div>

            {loading ? (
              <div className="flex gap-3 overflow-x-auto">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-36 aspect-[3/4] bg-[#0D0D12] rounded-2xl animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6 overflow-x-auto pb-2 scrollbar-none snap-x">
                {airing.map((anime) => (
                  <div key={anime.id} className="w-36 sm:w-auto shrink-0 snap-start">
                    <AnimeCard anime={anime} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Row 5: Top Rated */}
          <section className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-1 h-5 bg-purple-500 rounded-full inline-block md:hidden" />
                <Trophy className="w-5 h-5 text-amber-500 hidden md:inline-block" />
                Highest Rated Classics
              </h2>
            </div>

            {loading ? (
              <div className="flex gap-3 overflow-x-auto">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-36 aspect-[3/4] bg-[#0D0D12] rounded-2xl animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6 overflow-x-auto pb-2 scrollbar-none snap-x">
                {topRated.map((anime) => (
                  <div key={anime.id} className="w-36 sm:w-auto shrink-0 snap-start">
                    <AnimeCard anime={anime} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
