import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchAnime, ANIME_GENRES } from '../services/anilist/client';
import { AnimeMedia } from '../types/anime';
import AnimeCard from '../components/common/AnimeCard';
import { Search, Filter, Loader2, Sparkles } from 'lucide-react';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const genreParam = searchParams.get('genre') || 'All';
  const formatParam = searchParams.get('format') || 'All';
  const statusParam = searchParams.get('status') || 'All';
  const sortParam = searchParams.get('sort') || 'POPULARITY_DESC';

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [results, setResults] = useState<AnimeMedia[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync state when URL params change
  useEffect(() => {
    async function loadBrowseData() {
      setLoading(true);
      try {
        const data = await searchAnime({
          search: queryParam,
          genre: genreParam,
          format: formatParam,
          status: statusParam,
          sort: sortParam,
          page: 1,
          perPage: 24
        });
        setResults(data.media || []);
        setHasNextPage(data.pageInfo?.hasNextPage || false);
        setPage(1);
      } catch (err) {
        console.error('Browse fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBrowseData();
  }, [queryParam, genreParam, formatParam, statusParam, sortParam]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'All' || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchQuery);
  };

  const handleLoadMore = async () => {
    if (!hasNextPage || loading) return;
    const nextPage = page + 1;
    try {
      const data = await searchAnime({
        search: queryParam,
        genre: genreParam,
        format: formatParam,
        status: statusParam,
        sort: sortParam,
        page: nextPage,
        perPage: 24
      });
      setResults(prev => [...prev, ...(data.media || [])]);
      setHasNextPage(data.pageInfo?.hasNextPage || false);
      setPage(nextPage);
    } catch (err) {
      console.error('Load more error:', err);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="border-b border-slate-900 pb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight mb-2">
          <Sparkles className="w-6 h-6 text-purple-400" />
          Browse & Discover Anime
        </h1>
        <p className="text-xs text-slate-400">Search and filter live AniList database catalog.</p>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[#0D0D12] border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-xl">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search anime titles, characters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050507] text-white placeholder-slate-500 pl-11 pr-4 py-3 rounded-2xl border border-slate-800 focus:outline-none focus:border-purple-500 text-sm shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        </form>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Genre */}
          <div>
            <label className="block font-bold text-slate-400 mb-1">Genre</label>
            <select
              value={genreParam}
              onChange={(e) => updateParam('genre', e.target.value)}
              className="w-full bg-[#050507] text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 font-semibold"
            >
              <option value="All">All Genres</option>
              {ANIME_GENRES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Format */}
          <div>
            <label className="block font-bold text-slate-400 mb-1">Format</label>
            <select
              value={formatParam}
              onChange={(e) => updateParam('format', e.target.value)}
              className="w-full bg-[#050507] text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 font-semibold"
            >
              <option value="All">All Formats</option>
              <option value="TV">TV Series</option>
              <option value="MOVIE">Movie</option>
              <option value="OVA">OVA</option>
              <option value="ONA">ONA</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block font-bold text-slate-400 mb-1">Status</label>
            <select
              value={statusParam}
              onChange={(e) => updateParam('status', e.target.value)}
              className="w-full bg-[#050507] text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="RELEASING">Airing Now</option>
              <option value="FINISHED">Completed</option>
              <option value="NOT_YET_RELEASED">Upcoming</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block font-bold text-slate-400 mb-1">Sort By</label>
            <select
              value={sortParam}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="w-full bg-[#050507] text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 font-semibold"
            >
              <option value="POPULARITY_DESC">Most Popular</option>
              <option value="SCORE_DESC">Highest Rated</option>
              <option value="TRENDING_DESC">Trending Now</option>
              <option value="START_DATE_DESC">Newest Releases</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-[#0D0D12] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>

          {/* Load More Button */}
          {hasNextPage && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-8 py-3 rounded-2xl shadow-xl shadow-purple-950/50 transition-all hover:scale-105"
              >
                Load More Anime
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#0D0D12] rounded-3xl border border-slate-900">
          <p className="text-slate-400 text-sm font-medium">No anime found matching selected filters.</p>
        </div>
      )}
    </div>
  );
}
