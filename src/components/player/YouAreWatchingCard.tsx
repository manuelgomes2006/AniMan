import React from 'react';
import { Film, PlayCircle, Tv } from 'lucide-react';

interface YouAreWatchingCardProps {
  animeTitle: string;
  epTitle?: string;
  episodeNumber: number;
  coverImage?: string;
}

export default function YouAreWatchingCard({
  animeTitle,
  epTitle,
  episodeNumber,
  coverImage,
}: YouAreWatchingCardProps) {
  const displayEpTitle = epTitle || `Episode ${episodeNumber}`;

  return (
    <div className="bg-[#0D0D12] border border-slate-800/80 rounded-3xl p-4 space-y-3 shadow-xl">
      <div className="flex items-center gap-2">
        <Tv className="w-4 h-4 text-purple-400" />
        <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">You're Watching</h3>
      </div>

      <div className="bg-[#050507] border border-slate-800/80 rounded-2xl p-3.5 flex items-center gap-3.5">
        <img
          src={coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=200&q=80'}
          alt={animeTitle}
          className="w-14 h-20 rounded-xl object-cover shrink-0 border border-slate-800 shadow-md"
        />

        <div className="min-w-0 flex-1 space-y-1">
          {/* Anime Name */}
          <div className="flex items-center gap-1.5 text-purple-400 font-extrabold text-[11px] uppercase tracking-wide">
            <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">{animeTitle}</span>
          </div>

          {/* Episode Title / Name */}
          <h4 className="text-sm font-black text-white line-clamp-1 leading-snug">
            {displayEpTitle}
          </h4>

          {/* Episode Number Badge (No Season) */}
          <div className="inline-flex items-center gap-1.5 bg-purple-950/60 border border-purple-800/60 text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-md mt-1">
            <PlayCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>Episode {episodeNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
