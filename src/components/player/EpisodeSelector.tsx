import React, { useState, useMemo, useEffect } from 'react';
import { Play, ArrowUpDown, LayoutGrid, List, CornerDownLeft } from 'lucide-react';
import { NormalizedEpisode } from '../../services/episodes/episodes';

interface EpisodeSelectorProps {
  episodes: NormalizedEpisode[];
  currentEpisode: number;
  onSelectEpisode: (epNum: number) => void;
  coverImage?: string;
}

export default function EpisodeSelector({
  episodes,
  currentEpisode,
  onSelectEpisode,
  coverImage
}: EpisodeSelectorProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');
  const [jumpInput, setJumpInput] = useState('');
  const [rangeIndex, setRangeIndex] = useState(0);

  const releasedCount = episodes.length;
  const RANGE_SIZE = 100;

  // Compute 100-episode chunk ranges for long-running series
  const ranges = useMemo(() => {
    const r: { start: number; end: number; label: string }[] = [];
    for (let i = 0; i < releasedCount; i += RANGE_SIZE) {
      const start = i + 1;
      const end = Math.min(i + RANGE_SIZE, releasedCount);
      r.push({ start, end, label: `${start}-${end}` });
    }
    return r;
  }, [releasedCount]);

  // Auto-sync rangeIndex when currentEpisode changes
  useEffect(() => {
    if (currentEpisode && ranges.length > 0) {
      const targetIdx = ranges.findIndex(r => currentEpisode >= r.start && currentEpisode <= r.end);
      if (targetIdx >= 0) {
        setRangeIndex(targetIdx);
      }
    }
  }, [currentEpisode, ranges]);

  // Filter & sort released episodes for current range chunk
  const currentRange = ranges[rangeIndex] || { start: 1, end: releasedCount };

  const displayedEpisodes = useMemo(() => {
    let list = episodes.filter(ep => ep.number >= currentRange.start && ep.number <= currentRange.end);

    if (sortOrder === 'newest') {
      list = [...list].reverse();
    }

    return list;
  }, [episodes, currentRange, sortOrder]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const epNum = parseInt(jumpInput, 10);
    if (!isNaN(epNum) && epNum >= 1 && epNum <= releasedCount) {
      const targetRangeIdx = ranges.findIndex(r => epNum >= r.start && epNum <= r.end);
      if (targetRangeIdx >= 0) setRangeIndex(targetRangeIdx);
      onSelectEpisode(epNum);
      setJumpInput('');
    }
  };

  return (
    <div className="bg-[#0D0D12] border border-slate-800/90 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xl">
      {/* Header Row: ▶ Episodes | Range Dropdown | Total Badge | Sort & View Mode Switcher */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-white font-extrabold text-xs sm:text-sm">
            <Play className="w-3.5 h-3.5 text-purple-500 fill-purple-500" />
            <span>Episodes</span>
          </div>

          {/* Range Dropdown Pill */}
          {ranges.length > 1 && (
            <select
              value={rangeIndex}
              onChange={(e) => setRangeIndex(parseInt(e.target.value, 10))}
              className="bg-[#14141F] text-purple-300 border border-slate-800 rounded-lg px-2 py-0.5 text-xs font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {ranges.map((r, idx) => (
                <option key={r.label} value={idx}>
                  {r.label}
                </option>
              ))}
            </select>
          )}

          <span className="bg-purple-950/80 text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-800/40">
            {releasedCount}
          </span>
        </div>

        {/* Action Controls: Sort & View Mode Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
            className="flex items-center gap-1 bg-[#14141F] hover:bg-slate-800 text-slate-300 px-2 py-1 rounded-xl border border-slate-800 text-xs font-bold transition cursor-pointer"
            title="Sort Order"
          >
            <ArrowUpDown className="w-3 h-3 text-purple-400" />
            <span className="hidden sm:inline capitalize">{sortOrder}</span>
          </button>

          {/* View Mode Toggle Switcher */}
          <div className="bg-[#14141F] p-0.5 rounded-xl border border-slate-800 flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-lg transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Ep # Jump Input + Legend Dots Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
          <input
            type="number"
            placeholder="Ep #"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            className="w-16 sm:w-20 bg-[#14141F] text-white placeholder-slate-500 px-2.5 py-1 rounded-xl border border-slate-800 text-xs font-bold focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="bg-[#14141F] hover:bg-purple-600 text-slate-300 hover:text-white p-1 rounded-xl border border-slate-800 transition cursor-pointer"
            title="Jump to Episode"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Legend Indicators: 🟠 Filler  🔴 Recap */}
        <div className="flex items-center gap-3 text-[10px] font-extrabold text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>Filler</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <span>Recap</span>
          </div>
        </div>
      </div>

      {/* Grid View Mode */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-1.5 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
          {displayedEpisodes.map((ep) => {
            const isCurrent = ep.number === currentEpisode;
            const isFiller = ep.isFiller;
            const isRecap = ep.isRecap;

            let tileStyle = 'bg-[#12121A] text-slate-300 border-slate-800/80 hover:bg-slate-800 hover:text-white';

            if (isCurrent) {
              tileStyle = 'bg-purple-600 text-white font-black shadow-md shadow-purple-950/80 border-purple-400 ring-2 ring-purple-500/50 scale-105';
            } else if (isFiller) {
              tileStyle = 'bg-amber-950/20 text-amber-400 border-amber-500/60 hover:bg-amber-900/40';
            } else if (isRecap) {
              tileStyle = 'bg-rose-950/20 text-rose-400 border-rose-500/60 hover:bg-rose-900/40';
            }

            return (
              <button
                key={ep.number}
                onClick={() => onSelectEpisode(ep.number)}
                className={`h-9 rounded-lg border flex items-center justify-center font-extrabold text-xs transition-all duration-150 active:scale-95 cursor-pointer ${tileStyle}`}
                title={`Episode ${ep.number}${ep.title ? `: ${ep.title}` : ''}`}
              >
                {ep.number}
              </button>
            );
          })}
        </div>
      ) : (
        /* List View Mode */
        <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
          {displayedEpisodes.map((ep) => {
            const isCurrent = ep.number === currentEpisode;
            return (
              <button
                key={ep.number}
                onClick={() => onSelectEpisode(ep.number)}
                className={`w-full text-left rounded-xl overflow-hidden flex items-center gap-3 p-1.5 transition border cursor-pointer ${
                  isCurrent
                    ? 'bg-purple-950/50 border-purple-500 shadow-md ring-1 ring-purple-500/40'
                    : 'bg-[#12121A] hover:bg-slate-900 border-slate-800/80'
                }`}
              >
                <div className="relative w-14 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-950">
                  <img src={coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80'} alt={ep.title} className="w-full h-full object-cover" />
                  {isCurrent && (
                    <div className="absolute inset-0 bg-purple-900/70 backdrop-blur-[1px] flex items-center justify-center">
                      <Play className="w-3 h-3 fill-white text-white animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isCurrent ? 'text-purple-400' : 'text-slate-400'}`}>
                      EPISODE {ep.number}
                    </span>
                    {ep.isFiller && (
                      <span className="text-[8px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-1 rounded">
                        FILLER
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1">
                    {ep.title}
                  </h4>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
