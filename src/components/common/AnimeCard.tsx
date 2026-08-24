import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Plus, Check } from 'lucide-react';
import { AnimeMedia } from '../../types/anime';
import { setWatchlistCategory, getWatchlistItem } from '../../services/userStore';

interface AnimeCardProps {
  anime?: AnimeMedia;
  variant?: 'standard' | 'progress';
  progressData?: {
    episodeNumber: number;
    currentTime: number;
    duration: number;
    timeLeft?: string;
  };
}

export default function AnimeCard({ anime, variant = 'standard', progressData }: AnimeCardProps) {
  if (!anime) return null;

  const title = anime.title?.english || anime.title?.romaji || anime.title?.native || 'Untitled Anime';
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.5';
  const cover = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium;
  const episodes = anime.episodes ? `Ep ${anime.episodes}` : 'Ongoing';
  const format = anime.format || 'TV';

  const [inWatchlist, setInWatchlist] = useState(Boolean(getWatchlistItem(anime.id)));

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = setWatchlistCategory(anime, 'watching');
    setInWatchlist(Boolean(updated));
  };

  // Continue Watching Card Variant (Matching Image 1 row 2)
  if (variant === 'progress' && progressData) {
    const percentage = progressData.duration > 0
      ? Math.min(100, Math.round((progressData.currentTime / progressData.duration) * 100))
      : 15;

    return (
      <Link
        to={`/watch/${anime.id}/${progressData.episodeNumber}`}
        className="group bg-[#0D0D12] border border-slate-900/90 hover:border-purple-500/50 rounded-2xl p-3 flex items-center gap-4 transition-all duration-300 shadow-lg hover:shadow-purple-950/20 hover:-translate-y-1"
      >
        <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-slate-950 shrink-0">
          <img
            src={cover}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition">
            <div className="w-9 h-9 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[11px] text-purple-400 font-bold uppercase tracking-wider block mb-0.5">
            S1 • Ep {progressData.episodeNumber}
          </span>
          <h4 className="font-extrabold text-sm text-white line-clamp-1 group-hover:text-purple-400 transition">
            {title}
          </h4>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
            {progressData.timeLeft || '15m left'}
          </span>
          <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </Link>
    );
  }

  // Standard Poster Card (Matching Image 1 row 1)
  return (
    <div className="group relative bg-[#0D0D12] rounded-2xl overflow-hidden border border-slate-900/80 hover:border-purple-500/50 transition-all duration-300 flex flex-col shadow-lg hover:shadow-purple-950/30 hover:-translate-y-1.5">
      {/* Poster Image Container */}
      <Link to={`/anime/${anime.id}`} className="relative aspect-[3/4] overflow-hidden bg-slate-950 block">
        <img
          src={cover}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] via-[#0D0D12]/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

        {/* Top Watchlist Toggle Button */}
        <button
          onClick={handleToggleWatchlist}
          className={`absolute top-2.5 right-2.5 z-20 p-2 rounded-full backdrop-blur-md transition-transform duration-200 active:scale-95 ${
            inWatchlist
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950'
              : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80 border border-slate-700/60'
          }`}
          title={inWatchlist ? 'In Watchlist' : 'Add to List'}
        >
          {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>

        {/* Rating Badge at bottom right of image (Image 1 style) */}
        <div className="absolute bottom-2.5 right-2.5 z-10 bg-[#050507]/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1">
          <Star className="w-3 h-3 text-purple-400 fill-purple-400" />
          <span className="text-[11px] font-extrabold text-white">{score}</span>
        </div>

        {/* Hover Quick Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 bg-black/40 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xl shadow-purple-950 scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>
      </Link>

      {/* Card Info */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <Link
            to={`/anime/${anime.id}`}
            className="font-bold text-xs sm:text-sm text-slate-100 hover:text-purple-400 line-clamp-1 transition leading-snug"
            title={title}
          >
            {title}
          </Link>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-medium">
            <span>S1 • {episodes}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
