import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Plus, Check, Flame, Star } from 'lucide-react';
import { AnimeMedia } from '../../types/anime';
import { setWatchlistCategory, getWatchlistItem } from '../../services/userStore';

interface HeroCarouselProps {
  items: AnimeMedia[];
}

export default function HeroCarousel({ items = [] }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (!items || items.length === 0) return null;

  const anime = items[currentIndex];
  const title = anime.title?.english || anime.title?.romaji || 'Featured Anime';
  const banner = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large;
  const synopsis = anime.description?.replace(/<[^>]*>?/gm, '') || 'No description available.';
  const inWatchlist = Boolean(getWatchlistItem(anime.id));

  const handleToggleList = (e: React.MouseEvent) => {
    e.preventDefault();
    setWatchlistCategory(anime, 'watching');
  };

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden mb-5 sm:mb-10 border border-slate-900 shadow-2xl bg-[#050507]">
      {/* Background Image Container — 35-45% Viewport Height on Mobile (<768px) */}
      <div className="relative w-full h-[220px] sm:h-[480px]">
        <img
          src={banner}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-90 transition-all duration-700"
        />

        {/* Multi-layer Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050507] via-[#050507]/85 to-transparent w-full sm:w-2/3 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-[#050507]/40 z-10" />

        {/* Top-Right Indicator Dots */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1">
          {items.slice(0, 4).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx ? 'w-4 bg-purple-500 shadow-glow' : 'w-1 bg-slate-500/50'
              }`}
            />
          ))}
        </div>

        {/* Hero Content Overlay */}
        <div className="relative z-20 h-full max-w-3xl px-4 sm:px-12 flex flex-col justify-end pb-4 sm:pb-12">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-purple-600/90 text-white font-extrabold text-[9px] sm:text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg">
              <Flame className="w-3 h-3 fill-white" />
              #{currentIndex + 1} Trending
            </span>
            {anime.averageScore && (
              <span className="bg-[#0D0D12]/90 text-amber-400 text-[9px] sm:text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-500/20">
                <Star className="w-3 h-3 fill-amber-400" />
                {(anime.averageScore / 10).toFixed(1)}
              </span>
            )}
            <span className="text-[9px] text-slate-400 font-semibold hidden sm:inline-block">
              {anime.seasonYear || 2024} • {anime.format || 'TV'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-4xl font-black text-white uppercase tracking-tight leading-none mb-1.5 sm:mb-3 drop-shadow-md line-clamp-1">
            {title}
          </h1>

          {/* Synopsis */}
          <p className="text-slate-300 text-[11px] sm:text-sm line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-6 leading-relaxed max-w-2xl font-normal opacity-90">
            {synopsis}
          </p>

          {/* Buttons: [ ▶ Watch Now ] [ + ] */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={`/watch/${anime.id}/1`}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs sm:text-sm px-4 sm:px-7 py-2 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-xl shadow-purple-950/60 transition-all border border-purple-500/30"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Watch Now
            </Link>

            <button
              onClick={handleToggleList}
              className="p-2 sm:px-5 sm:py-3.5 bg-[#0D0D12]/90 hover:bg-[#0D0D12] backdrop-blur-md text-white font-semibold text-xs rounded-xl sm:rounded-2xl border border-slate-800 transition hover:border-purple-500/40"
              title={inWatchlist ? 'In List' : 'Add to List'}
            >
              {inWatchlist ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Plus className="w-3.5 h-3.5 text-slate-200" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
