import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Plus, Check, Flame, Star, Calendar } from 'lucide-react';
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

  const handleToggleList = () => {
    setWatchlistCategory(anime, 'watching');
  };

  return (
    <div className="relative w-full h-[420px] sm:h-[500px] rounded-3xl overflow-hidden mb-10 border border-slate-900 shadow-2xl bg-[#050507]">
      {/* Background Image */}
      <img
        src={banner}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover object-center scale-105 filter brightness-90 transition-all duration-700"
      />

      {/* Multi-layer Gradient Overlays (Image 1 style) */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#050507] via-[#050507]/80 to-transparent w-full sm:w-2/3 z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-[#050507]/40 z-10" />

      {/* Hero Content */}
      <div className="relative z-20 h-full max-w-3xl px-6 sm:px-12 flex flex-col justify-end pb-10 sm:pb-14">
        {/* Spotlight Pill */}
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-purple-600 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-purple-950/60">
            <Flame className="w-3.5 h-3.5 fill-white" />
            #{currentIndex + 1} Trending
          </span>
          {anime.averageScore && (
            <span className="bg-[#0D0D12]/80 backdrop-blur-md text-amber-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-amber-500/20">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              {(anime.averageScore / 10).toFixed(1)} Score
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none mb-3 drop-shadow-md">
          {title}
        </h1>

        {/* Synopsis */}
        <p className="text-slate-300 text-xs sm:text-sm line-clamp-3 mb-6 leading-relaxed max-w-2xl font-normal opacity-90">
          {synopsis}
        </p>

        {/* Hero Buttons (Image 1 format) */}
        <div className="flex items-center gap-4">
          <Link
            to={`/watch/${anime.id}/1`}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm px-7 py-3.5 rounded-2xl shadow-xl shadow-purple-950/60 hover:scale-105 transition-all duration-200 border border-purple-500/30"
          >
            <Play className="w-4 h-4 fill-white" />
            Watch Now
          </Link>

          <button
            onClick={handleToggleList}
            className="flex items-center gap-2 bg-[#0D0D12]/80 hover:bg-[#0D0D12] backdrop-blur-md text-white font-semibold text-sm px-6 py-3.5 rounded-2xl border border-slate-800 transition-all hover:border-purple-500/40"
          >
            {inWatchlist ? (
              <>
                <Check className="w-4 h-4 text-purple-400" />
                In Your List
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-slate-300" />
                Add to List
              </>
            )}
          </button>
        </div>

        {/* Carousel Indicators (Image 1 format) */}
        <div className="flex items-center gap-2 mt-6">
          {items.slice(0, 5).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx ? 'w-8 bg-purple-500 shadow-glow' : 'w-2 bg-slate-800 hover:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
