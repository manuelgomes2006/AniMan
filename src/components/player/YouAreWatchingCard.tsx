import React from 'react';
import { ChevronRight } from 'lucide-react';

interface YouAreWatchingCardProps {
  title: string;
  episodeNumber: number;
  coverImage?: string;
  currentTimeStr?: string;
  durationStr?: string;
}

export default function YouAreWatchingCard({
  title,
  episodeNumber,
  coverImage,
  currentTimeStr = '14:37',
  durationStr = '23:50'
}: YouAreWatchingCardProps) {
  return (
    <div className="bg-[#0D0D12]/90 border border-slate-800/80 rounded-3xl p-4 space-y-3 shadow-xl">
      <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">You're Watching</h3>

      <div className="bg-[#050507]/90 border border-slate-800/80 rounded-2xl p-3 flex items-center gap-3">
        <img
          src={coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=200&q=80'}
          alt={title}
          className="w-12 h-16 rounded-xl object-cover shrink-0 border border-slate-800"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-xs font-black text-white line-clamp-1">{title}</h4>
          <p className="text-[11px] font-semibold text-purple-400">S1 • Ep {episodeNumber}</p>

          <div className="space-y-1 pt-1">
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full w-[62%] rounded-full" />
            </div>
            <p className="text-[9px] text-slate-500 font-semibold text-right">{currentTimeStr} / {durationStr}</p>
          </div>
        </div>
      </div>

      <button className="w-full text-center text-xs font-extrabold text-purple-400 hover:text-purple-300 py-1 transition flex items-center justify-center gap-1 cursor-pointer">
        <span>Continue Watching</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
