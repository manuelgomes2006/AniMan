import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'hero' | 'player' | 'list';
  count?: number;
}

export default function SkeletonLoader({ type = 'card', count = 1 }: SkeletonLoaderProps) {
  if (type === 'hero') {
    return (
      <div className="w-full h-[220px] sm:h-[480px] bg-[#0D0D12] rounded-2xl sm:rounded-3xl animate-pulse mb-6 border border-slate-900 flex flex-col justify-end p-6 space-y-3">
        <div className="w-24 h-4 bg-slate-800 rounded-md" />
        <div className="w-2/3 h-8 bg-slate-800 rounded-lg" />
        <div className="w-1/2 h-4 bg-slate-800 rounded-md" />
        <div className="flex gap-3 pt-2">
          <div className="w-28 h-9 bg-purple-900/40 rounded-xl" />
          <div className="w-10 h-9 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (type === 'player') {
    return (
      <div className="w-full aspect-video bg-[#0D0D12] rounded-2xl sm:rounded-3xl border border-slate-800 animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-800" />
        <div className="w-36 h-3 bg-slate-800 rounded-full" />
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="h-16 bg-[#0D0D12] rounded-xl border border-slate-900 animate-pulse p-3 flex items-center gap-3">
            <div className="w-16 h-10 bg-slate-800 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="w-1/2 h-3 bg-slate-800 rounded" />
              <div className="w-1/4 h-2.5 bg-slate-800/80 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Card Skeleton (Dense & Poster)
  return (
    <div className="flex gap-2.5 overflow-x-auto">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="w-[115px] sm:w-auto shrink-0 aspect-[3/4] bg-[#0D0D12] rounded-xl border border-slate-900/80 animate-pulse p-2 flex flex-col justify-end space-y-1.5"
        >
          <div className="w-full h-3 bg-slate-800 rounded" />
          <div className="w-1/2 h-2.5 bg-slate-800/80 rounded" />
        </div>
      ))}
    </div>
  );
}
