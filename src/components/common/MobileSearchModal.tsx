import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, X, Star, Flame, Clock, Loader2 } from 'lucide-react';
import { searchAnime } from '../../services/anilist/client';
import { AnimeMedia } from '../../types/anime';

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSearchModal({ isOpen, onClose }: MobileSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const trendingTags = ['Solo Leveling', 'Demon Slayer', 'One Piece', 'Jujutsu Kaisen', 'Attack on Titan', 'Bleach'];

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchAnime({ search: query, perPage: 10 });
        setResults(res.media || []);
      } catch (err) {
        console.error('Mobile Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] flex flex-col md:hidden">
      {/* Top Header Search Input Bar */}
      <div className="p-3 bg-[#0D0D12] border-b border-slate-800 flex items-center gap-3">
        <button onClick={onClose} className="p-1 text-slate-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            autoFocus
            placeholder="Search anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#050507] border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:border-purple-500"
          />
          <Search className="w-4 h-4 text-purple-400 absolute left-3" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Search Results</h4>
            {results.map((anime) => {
              const title = anime.title?.english || anime.title?.romaji || 'Anime';
              const cover = anime.coverImage?.medium || anime.coverImage?.large;
              return (
                <div
                  key={anime.id}
                  onClick={() => {
                    navigate(`/anime/${anime.id}`);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl bg-[#0D0D12] border border-slate-900 active:bg-purple-600/20"
                >
                  <img src={cover} alt={title} className="w-12 h-16 object-cover rounded-lg shrink-0 bg-slate-950" />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-white line-clamp-1">{title}</h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.5'}
                      </span>
                      <span>•</span>
                      <span>{anime.format || 'TV'}</span>
                      <span>•</span>
                      <span>{anime.seasonYear || '2024'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Trending Quick Tags */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-4 h-4 text-purple-400" />
                Trending Searches
              </h4>
              <div className="flex flex-wrap gap-2">
                {trendingTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="bg-[#0D0D12] text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-800 active:border-purple-500"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
