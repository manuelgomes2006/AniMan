import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Star, Tv, Loader2 } from 'lucide-react';
import { searchAnime } from '../../services/anilist/client';
import { AnimeMedia } from '../../types/anime';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcut listener (Esc key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search fetch
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchAnime({ search: query, perPage: 8 });
        setResults(res.media || []);
      } catch (err) {
        console.error('Search Overlay error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-16 px-4">
      <div className="bg-[#0D0D12] border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative">
        {/* Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-purple-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search anime title, genre, studio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          {loading && <Loader2 className="w-5 h-5 text-purple-500 animate-spin shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
          {results.length > 0 ? (
            results.map((anime) => {
              const title = anime.title?.english || anime.title?.romaji || 'Anime';
              const cover = anime.coverImage?.medium || anime.coverImage?.large;
              return (
                <div
                  key={anime.id}
                  onClick={() => {
                    navigate(`/anime/${anime.id}`);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-purple-600/10 hover:border-purple-500/30 border border-transparent cursor-pointer transition"
                >
                  <img src={cover} alt={title} className="w-12 h-16 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white line-clamp-1">{title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 text-amber-400 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.0'}
                      </span>
                      <span>•</span>
                      <span>{anime.format || 'TV'}</span>
                      <span>•</span>
                      <span>{anime.seasonYear || '2024'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : query.trim() ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              Type any anime title to search AniList catalog...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
