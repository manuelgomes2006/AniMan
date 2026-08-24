import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  getTrendingAnime, getPopularAnime, getTopRatedAnime,
  getCurrentlyAiringAnime, searchAnime, ANIME_GENRES
} from '../services/anilist/client';
import { getWatchHistory } from '../services/userStore';
import { AnimeMedia } from '../types/anime';
import { WatchProgress } from '../types/user';
import HeroCarousel from '../components/common/HeroCarousel';
import AnimeCard from '../components/common/AnimeCard';
import { Flame, Sparkles, Trophy, Clock, Filter, Loader2, Play, ChevronRight } from 'lucide-react';

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
    <div className="space-y-6 sm:space-y-10 pb-16">
      {/* Spotlight Hero Banner */}
      {!isSearchOrFilterActive && !loading && trending.length > 0 && (
        <HeroCarousel items={trending} />
      )}

      {/* Genre Filter Scroll Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold text-xs">
          <Filter className="w-3.5 h-3.5 text-purple-400" />
          <span>Quick Genre Filter</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
          {['All', ...ANIME_GENRES].map((genre) => (
            <button
              key={genre}
              onClick={() => handleGenreChange(genre)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedGenre === genre || (genre === 'All' && selectedGenre === 'All')
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-[#0D0D12] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-900'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Search or Filter Active Grid */}
      {isSearchOrFilterActive ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <h2 className="text-base sm:text-xl font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
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
          {/* LATEST EPISODES SECTION (HiAnime-Style Prominent Section with SUB/DUB Badges) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
                <Play className="w-4 h-4 text-purple-400 fill-purple-400/20" />
                Latest Episodes
              </h2>
              <Link to="/browse?tab=latest" className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex gap-2.5 overflow-x-auto">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-[115px] aspect-[3/4] bg-[#0D0D12] rounded-xl animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                {airing.slice(0, 10).map((anime, idx) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    variant="latest"
                    episodeNumber={anime.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 || 6 : (idx % 8) + 1}
                    hasDub={idx % 2 === 0}
                  />
                ))}
              </div>
            )}
          </section>

          {/* TRENDING NOW SECTION (Dense horizontal carousel) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
                <Flame className="w-4 h-4 text-purple-400 fill-purple-400/20 hidden sm:inline-block" />
                Trending Now
              </h2>
              <Link to="/browse?sort=TRENDING_DESC" className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex gap-2.5 overflow-x-auto">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-[115px] aspect-[3/4] bg-[#0D0D12] rounded-xl animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-6 overflow-x-auto pb-2 scrollbar-none snap-x">
                {trending.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            )}
          </section>

          {/* CONTINUE WATCHING SECTION */}
          {continueWatching.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                  <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
                  <Clock className="w-4 h-4 text-purple-400 hidden sm:inline-block" />
                  Continue Watching
                </h2>
                <Link to="/watchlist?tab=history" className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
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

          {/* POPULAR ANIME SECTION */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
                <Sparkles className="w-4 h-4 text-amber-400 hidden sm:inline-block" />
                Popular This Week
              </h2>
              <Link to="/browse?sort=POPULARITY_DESC" className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex gap-2.5 overflow-x-auto">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-[115px] aspect-[3/4] bg-[#0D0D12] rounded-xl animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-6 overflow-x-auto pb-2 scrollbar-none snap-x">
                {popular.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            )}
          </section>

          {/* TOP AIRING SECTION */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
                Top Airing
              </h2>
              <Link to="/browse?status=RELEASING" className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex gap-2.5 overflow-x-auto">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-[115px] aspect-[3/4] bg-[#0D0D12] rounded-xl animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-6 overflow-x-auto pb-2 scrollbar-none snap-x">
                {airing.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            )}
          </section>

          {/* TOP RATED CLASSICS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
                <Trophy className="w-4 h-4 text-amber-500 hidden sm:inline-block" />
                Highest Rated
              </h2>
              <Link to="/browse?sort=SCORE_DESC" className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex gap-2.5 overflow-x-auto">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-[115px] aspect-[3/4] bg-[#0D0D12] rounded-xl animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-6 overflow-x-auto pb-2 scrollbar-none snap-x">
                {topRated.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
