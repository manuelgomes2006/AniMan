import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { AnimeMedia } from '../../types/anime';

interface CarouselRowProps {
  title: string;
  items: AnimeMedia[];
  icon?: React.ReactNode;
  variant?: 'standard' | 'latest';
  actionLink?: React.ReactNode;
}

export default function CarouselRow({
  title,
  items,
  icon,
  variant = 'standard',
  actionLink
}: CarouselRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = direction === 'left' ? -480 : 480;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-3 group relative">
      {/* Header Row: Icon + Title + Scroll Arrows */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {actionLink}

          {/* Left & Right Scroll Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-xl bg-[#0D0D12] hover:bg-purple-600 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer active:scale-95"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-xl bg-[#0D0D12] hover:bg-purple-600 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer active:scale-95"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Carousel Container */}
      <div
        ref={rowRef}
        className="flex items-center gap-3 overflow-x-auto scrollbar-none scroll-smooth touch-pan-x py-1 px-0.5"
      >
        {items.map((item, idx) => (
          <AnimeCard
            key={`${item.id}-${idx}`}
            anime={item}
            variant={variant}
            episodeNumber={item.nextAiringEpisode?.episode ? item.nextAiringEpisode.episode - 1 : 12}
          />
        ))}
      </div>
    </section>
  );
}
