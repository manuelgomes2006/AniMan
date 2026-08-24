import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Plus, Check, MoreVertical } from 'lucide-react';
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

  // Continue Watching Card Variant (Matching Mockup 1 layout)
  if (variant === 'progress' && progressData) {
    const percentage = progressData.duration > 0
      ? Math.min(100, Math.round((progressData.currentTime / progressData.duration) * 100))
      : 25;

    return (
      <Link
        to={`/watch/${anime.id}/${progressData.episodeNumber}`}
        className="group bg-[#0D0D12] border border-slate-900/90 hover:border-purple-500/50 rounded-2xl p-3 flex items-center gap-3.5 transition-all duration-300 shadow-lg hover:shadow-purple-950/20"
      >
        {/* Left Thumbnail */}
        <div className="relative w-24 sm:w-28 aspect-video rounded-xl overflow-hidden bg-slate-950 shrink-0">
          <img
            src={cover}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Info + Progress Bar */}
        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-xs sm:text-sm text-white line-clamp-1 group-hover:text-purple-400 transition">
            {title}
          </h4>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block mt-0.5">
            S1 • Ep {progressData.episodeNumber}
          </span>
          <span className="text-[10px] text-purple-400 font-semibold block mt-0.5">
            {progressData.timeLeft || '15m left'}
          </span>
          <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Circular Play Button & Options (Matching Mockup 1) */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="p-1 text-slate-500 hover:text-white"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </Link>
    );
  }

  // Standard Poster Card (Matching Mockup 1 horizontal carousel & grid)
  return (
    <div className="group relative bg-[#0D0D12] rounded-2xl overflow-hidden border border-slate-900/80 hover:border-purple-500/50 transition-all duration-300 flex flex-col shadow-lg hover:shadow-purple-950/30">
      {/* Poster Image Container */}
      <Link to={`/anime/${anime.id}`} className="relative aspect-[3/4] overflow-hidden bg-slate-950 block">
        <img
          src={cover}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Overlay Shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] via-[#0D0D12]/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

        {/* Top Watchlist Toggle Button */}
        <button
          onClick={handleToggleWatchlist}
          className={`absolute top-2 right-2 z-20 p-1.5 rounded-full backdrop-blur-md transition-transform duration-200 active:scale-95 ${
            inWatchlist
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80 border border-slate-700/60'
          }`}
          title={inWatchlist ? 'In Watchlist' : 'Add to List'}
        >
          {inWatchlist ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </button>

        {/* Rating Badge at bottom right of poster (Mockup 1 style) */}
        <div className="absolute bottom-2 right-2 z-10 bg-[#050507]/90 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1">
          <Star className="w-3 h-3 text-purple-400 fill-purple-400" />
          <span className="text-[10px] font-extrabold text-white">{score}</span>
        </div>
      </Link>

      {/* Card Info Below Poster */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <Link
            to={`/anime/${anime.id}`}
            className="font-bold text-xs text-slate-100 hover:text-purple-400 line-clamp-1 transition leading-snug"
            title={title}
          >
            {title}
          </Link>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
            <span>S1 • {episodes}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
