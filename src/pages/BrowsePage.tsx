import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchAnime } from '../services/anilist/client';
import { AnimeMedia } from '../types/anime';
import AnimeCard from '../components/common/AnimeCard';
import MobileFilterSheet from '../components/common/MobileFilterSheet';
import { Search, Filter, Sparkles, HelpCircle } from 'lucide-react';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const genreParam = searchParams.get('genre') || 'All';
  const formatParam = searchParams.get('format') || 'All';
  const statusParam = searchParams.get('status') || 'All';
  const sortParam = searchParams.get('sort') || 'POPULARITY_DESC';
  const filterTab = searchParams.get('tab') || 'all';

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [results, setResults] = useState<AnimeMedia[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Typo Tolerance State
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [originalQuery, setOriginalQuery] = useState<string | null>(null);

  useEffect(() => {
    async function loadBrowseData() {
      setLoading(true);
      setCorrectedQuery(null);
      setDidYouMean(null);
      setOriginalQuery(null);

      try {
        let activeSort = sortParam;
        let activeStatus = statusParam;
        let activeFormat = formatParam;

        if (filterTab === 'trending') activeSort = 'TRENDING_DESC';
        if (filterTab === 'popular') activeSort = 'POPULARITY_DESC';
        if (filterTab === 'airing') activeStatus = 'RELEASING';
        if (filterTab === 'completed') activeStatus = 'FINISHED';
        if (filterTab === 'movies') activeFormat = 'MOVIE';

        const data = await searchAnime({
          search: queryParam,
          genre: genreParam,
          format: activeFormat,
          status: activeStatus,
          sort: activeSort,
          page: 1,
          perPage: 24
        });

        setResults(data.media || []);
        setHasNextPage(data.pageInfo?.hasNextPage || false);
        setPage(1);

        if (data.correctedQuery) setCorrectedQuery(data.correctedQuery);
        if (data.didYouMean) setDidYouMean(data.didYouMean);
        if (data.originalQuery) setOriginalQuery(data.originalQuery);

      } catch (err) {
        console.error('Browse fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBrowseData();
  }, [queryParam, genreParam, formatParam, statusParam, sortParam, filterTab]);

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

  const handleApplyFilterSheet = (updated: { genre: string; format: string; status: string; sort: string }) => {
    const params = new URLSearchParams(searchParams);
    if (updated.genre !== 'All') params.set('genre', updated.genre); else params.delete('genre');
    if (updated.format !== 'All') params.set('format', updated.format); else params.delete('format');
    if (updated.status !== 'All') params.set('status', updated.status); else params.delete('status');
    if (updated.sort) params.set('sort', updated.sort);
    setSearchParams(params);
  };

  const filterChips = [
    { id: 'all', label: 'All' },
    { id: 'trending', label: 'Trending' },
    { id: 'popular', label: 'Popular' },
    { id: 'airing', label: 'Airing' },
    { id: 'completed', label: 'Completed' },
    { id: 'movies', label: 'Movies' },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="border-b border-slate-900 pb-4">
        <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Browse & Discover Anime
        </h1>
        <p className="text-xs text-slate-400">Search and filter live AniList database catalog.</p>
      </div>

      {/* Filter Control Section */}
      <div className="space-y-3">
        {/* Search Bar + Filter Sheet Trigger Button */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <input
              type="text"
              placeholder="Search anime (e.g. Naruto, One Piece, Demon Slayer)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D0D12] text-white placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-2xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs shadow-inner font-medium"
            />
            <Search className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className="flex items-center gap-1.5 bg-[#0D0D12] hover:bg-purple-600 text-slate-300 hover:text-white px-3.5 py-2.5 rounded-2xl border border-slate-800 text-xs font-bold shrink-0 transition cursor-pointer"
          >
            <Filter className="w-4 h-4 text-purple-400" />
            <span>Filter</span>
          </button>
        </div>

        {/* Typo Correction & Spelling Suggestion Banners */}
        {correctedQuery && (
          <div className="bg-purple-950/40 border border-purple-800/80 p-3.5 rounded-2xl flex items-center justify-between text-xs text-purple-200 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Showing results for <strong className="text-white font-extrabold">{correctedQuery}</strong>
                {originalQuery && (
                  <span className="text-slate-400 text-[11px] ml-1.5">(Searched for: <em>"{originalQuery}"</em>)</span>
                )}
              </span>
            </div>
            <button
              onClick={() => {
                setSearchQuery(correctedQuery);
                updateParam('q', correctedQuery);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-xl text-[11px] transition cursor-pointer shrink-0 ml-2"
            >
              Search {correctedQuery}
            </button>
          </div>
        )}

        {didYouMean && !correctedQuery && (
          <div className="bg-purple-950/30 border border-purple-800/60 p-3 rounded-2xl flex items-center gap-2 text-xs text-purple-300 shadow-md">
            <HelpCircle className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              Did you mean{' '}
              <button
                onClick={() => {
                  setSearchQuery(didYouMean);
                  updateParam('q', didYouMean);
                }}
                className="font-extrabold text-white underline hover:text-purple-300 cursor-pointer"
              >
                "{didYouMean}"
              </button>
              ?
            </span>
          </div>
        )}

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => updateParam('tab', chip.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                filterTab === chip.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-[#0D0D12] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-[#0D0D12] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
            {results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-[#0D0D12] rounded-3xl border border-slate-900 space-y-2">
          <p className="text-slate-300 text-sm font-bold">No anime found matching your search.</p>
          <p className="text-slate-500 text-xs">Try searching for terms like <span className="text-purple-400 font-semibold">Naruto</span>, <span className="text-purple-400 font-semibold">One Piece</span>, or <span className="text-purple-400 font-semibold">Demon Slayer</span>.</p>
        </div>
      )}

      {/* Bottom Sheet Filter Panel */}
      <MobileFilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={{ genre: genreParam, format: formatParam, status: statusParam, sort: sortParam }}
        onApply={handleApplyFilterSheet}
      />
    </div>
  );
}
