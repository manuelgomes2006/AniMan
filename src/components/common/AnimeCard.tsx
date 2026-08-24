import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Plus, Check } from 'lucide-react';
import { AnimeMedia } from '../../types/anime';
import { setWatchlistCategory, getWatchlistItem } from '../../services/userStore';

interface AnimeCardProps {
  anime?: AnimeMedia;
  variant?: 'standard' | 'progress' | 'latest';
  episodeNumber?: number;
  hasDub?: boolean;
  progressData?: {
    episodeNumber: number;
    currentTime: number;
    duration: number;
    timeLeft?: string;
  };
}

export default function AnimeCard({ anime, variant = 'standard', episodeNumber, hasDub = true, progressData }: AnimeCardProps) {
  if (!anime) return null;

  const title = anime.title?.english || anime.title?.romaji || anime.title?.native || 'Untitled Anime';
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.5';
  const cover = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium;
  const episodes = anime.episodes ? `Ep ${anime.episodes}` : 'Ongoing';
  const format = anime.format || 'TV';

  const [inWatchlist, setInWatchlist] = useState(Boolean(getWatchlistItem(anime.id)));
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = setWatchlistCategory(anime, 'watching');
    setInWatchlist(Boolean(updated));
  };

  // HiAnime-Style Latest Episode Card Variant
  if (variant === 'latest') {
    const epNum = episodeNumber || 1;
    return (
      <div className="group relative bg-[#0D0D12] rounded-xl overflow-hidden border border-slate-900/90 hover:border-purple-500/50 transition-all duration-300 flex flex-col shadow-md w-[115px] sm:w-[135px] md:w-[155px] lg:w-[165px] shrink-0 gpu-accelerated active:scale-95">
        <Link to={`/watch/${anime.id}/${epNum}`} className="relative aspect-[2/3] overflow-hidden bg-slate-950 block">
          <img
            src={cover}
            alt={title}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Episode Number Badge Overlay */}
          <div className="absolute top-1.5 left-1.5 z-10 bg-purple-600/95 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[9px] font-black text-white uppercase shadow-md">
            EP {epNum < 10 ? `0${epNum}` : epNum}
          </div>

          {/* Rating Badge */}
          <div className="absolute bottom-1.5 right-1.5 z-10 bg-[#050507]/90 backdrop-blur-md px-1 py-0.5 rounded-md border border-slate-800 flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span className="text-[9px] font-extrabold text-white">{score}</span>
          </div>

          {/* Quick Play Hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
            <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </div>
          </div>
        </Link>

        {/* Card Info + SUB/DUB Badges */}
        <div className="p-2 flex-1 flex flex-col justify-between space-y-1">
          <Link
            to={`/watch/${anime.id}/${epNum}`}
            className="font-bold text-[11px] text-slate-100 hover:text-purple-400 line-clamp-1 leading-tight transition"
            title={title}
          >
            {title}
          </Link>

          {/* Glowing Purple SUB/DUB Badges */}
          <div className="flex items-center gap-1 text-[8px] font-extrabold pt-0.5">
            <span className="bg-purple-950 text-purple-300 border border-purple-700/60 px-1 py-0.2 rounded">
              SUB
            </span>
            {hasDub && (
              <span className="bg-purple-900/60 text-purple-200 border border-purple-600/40 px-1 py-0.2 rounded">
                DUB
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Continue Watching Card Variant
  if (variant === 'progress' && progressData) {
    const percentage = progressData.duration > 0
      ? Math.min(100, Math.round((progressData.currentTime / progressData.duration) * 100))
      : 25;

    return (
      <Link
        to={`/watch/${anime.id}/${progressData.episodeNumber}`}
        className="group bg-[#0D0D12] border border-slate-900/90 hover:border-purple-500/50 rounded-2xl p-2.5 flex items-center gap-3 transition-all duration-300 shadow-md active:scale-98 gpu-accelerated shrink-0 w-full"
      >
        <div className="relative w-16 sm:w-20 aspect-video rounded-xl overflow-hidden bg-slate-950 shrink-0">
          <img
            src={cover}
            alt={title}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-xs text-white line-clamp-1 group-hover:text-purple-400 transition">
            {title}
          </h4>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
            S1 • Ep {progressData.episodeNumber}
          </span>
          <span className="text-[10px] text-purple-400 font-semibold block mt-0.5">
            {progressData.timeLeft || '15m left'}
          </span>
          <div className="w-full bg-slate-900 h-1 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="w-7 h-7 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg shrink-0 transform group-hover:scale-110 transition-transform">
          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
        </div>
      </Link>
    );
  }

  // Standard Compact Poster Card
  return (
    <div className="group relative bg-[#0D0D12] rounded-xl overflow-hidden border border-slate-900/90 hover:border-purple-500/50 transition-all duration-300 flex flex-col shadow-md w-[115px] sm:w-[135px] md:w-[155px] lg:w-[165px] shrink-0 gpu-accelerated active:scale-95">
      <Link to={`/anime/${anime.id}`} className="relative aspect-[2/3] overflow-hidden bg-slate-950 block">
        <img
          src={cover}
          alt={title}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] via-transparent to-transparent opacity-80" />

        {/* Watchlist Toggle */}
        <button
          onClick={handleToggleWatchlist}
          className={`absolute top-1.5 right-1.5 z-20 p-1 rounded-full backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
            inWatchlist
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-black/60 text-slate-300 hover:text-white border border-slate-700/60'
          }`}
          title={inWatchlist ? 'In Watchlist' : 'Add to List'}
        >
          {inWatchlist ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
        </button>

        {/* Rating Badge */}
        <div className="absolute bottom-1.5 right-1.5 z-10 bg-[#050507]/90 backdrop-blur-md px-1 py-0.5 rounded-md border border-slate-800 flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
          <span className="text-[9px] font-extrabold text-white">{score}</span>
        </div>
      </Link>

      <div className="p-2 flex-1 flex flex-col justify-between space-y-0.5">
        <Link
          to={`/anime/${anime.id}`}
          className="font-bold text-[11px] text-slate-100 hover:text-purple-400 line-clamp-1 leading-tight transition"
          title={title}
        >
          {title}
        </Link>
        <div className="text-[9px] text-slate-400 font-medium">
          {format} • {episodes}
        </div>
      </div>
    </div>
  );
}
