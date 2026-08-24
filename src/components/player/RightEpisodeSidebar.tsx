import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Play, BarChart2, ChevronDown } from 'lucide-react';
import { NormalizedEpisode } from '../../services/episodes/episodes';

interface RightEpisodeSidebarProps {
  episodes: NormalizedEpisode[];
  currentEpisode?: number;
  currentEpNum?: number;
  onSelectEpisode: (epNum: number) => void;
  coverImage?: string;
  totalEpisodes?: number;
}

export default function RightEpisodeSidebar({
  episodes,
  currentEpisode,
  currentEpNum,
  onSelectEpisode,
  coverImage,
  totalEpisodes
}: RightEpisodeSidebarProps) {
  const activeEp = currentEpisode || currentEpNum || 1;
  const [activeTab, setActiveTab] = useState<'episodes' | 'related'>('episodes');
  const [rangeIndex, setRangeIndex] = useState(0);
  const activeEpRef = useRef<HTMLButtonElement | null>(null);

  const totalCount = Math.max(episodes.length, totalEpisodes || 0, activeEp, 12);
  const RANGE_SIZE = 100;

  // 100-episode ranges for long-running series
  const ranges = useMemo(() => {
    const r: { start: number; end: number; label: string }[] = [];
    for (let i = 0; i < totalCount; i += RANGE_SIZE) {
      const start = i + 1;
      const end = Math.min(i + RANGE_SIZE, totalCount);
      r.push({ start, end, label: `Range ${start}-${end}` });
    }
    return r;
  }, [totalCount]);

  // Auto-switch to range containing current active episode
  useEffect(() => {
    const targetIdx = ranges.findIndex(r => activeEp >= r.start && activeEp <= r.end);
    if (targetIdx >= 0 && targetIdx !== rangeIndex) {
      setRangeIndex(targetIdx);
    }
  }, [activeEp, ranges]);

  const currentRange = ranges[rangeIndex] || { start: 1, end: totalCount };

  const displayedEpisodes = useMemo(() => {
    const list = episodes.length > 0
      ? episodes.filter(ep => ep.number >= currentRange.start && ep.number <= currentRange.end)
      : Array.from({ length: currentRange.end - currentRange.start + 1 }, (_, i) => ({
          number: currentRange.start + i,
          title: `Episode ${currentRange.start + i}`,
          duration: 24,
          subAvailable: true,
          dubAvailable: true,
          playable: true
        }));

    return list.length > 0 ? list : Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
      duration: 24,
      subAvailable: true,
      dubAvailable: true,
      playable: true
    }));
  }, [episodes, currentRange]);

  // Auto scroll active episode into view
  useEffect(() => {
    if (activeEpRef.current) {
      activeEpRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeEp, rangeIndex]);

  return (
    <div className="bg-[#0D0D12]/90 border border-slate-800/80 rounded-3xl p-4 space-y-4 shadow-xl">
      {/* Top Tabs: Episodes | Related */}
      <div className="flex items-center border-b border-slate-800/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('episodes')}
          className={`pb-2 text-sm font-extrabold transition relative mr-6 cursor-pointer ${
            activeTab === 'episodes' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Episodes
          {activeTab === 'episodes' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('related')}
          className={`pb-2 text-sm font-extrabold transition relative cursor-pointer ${
            activeTab === 'related' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Related
          {activeTab === 'related' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
          )}
        </button>
      </div>

      {activeTab === 'episodes' ? (
        <>
          {/* Season / Range Selector Header */}
          <div className="flex items-center justify-between text-xs text-slate-300">
            {ranges.length > 1 ? (
              <div className="relative inline-block">
                <select
                  value={rangeIndex}
                  onChange={(e) => setRangeIndex(parseInt(e.target.value, 10))}
                  className="bg-[#14141F] text-slate-200 font-extrabold py-1 pl-2.5 pr-7 rounded-xl border border-slate-800 appearance-none cursor-pointer focus:outline-none focus:border-purple-500 text-xs"
                >
                  {ranges.map((r, idx) => (
                    <option key={r.label} value={idx}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <span className="font-extrabold text-slate-300">Season 1</span>
            )}

            <span className="text-slate-400 text-xs font-semibold">{totalCount} Episodes</span>
          </div>

          {/* Vertical Scrollable Episode List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
            {displayedEpisodes.map((ep) => {
              const isCurrent = ep.number === activeEp;
              return (
                <button
                  key={ep.number}
                  ref={isCurrent ? activeEpRef : null}
                  type="button"
                  onClick={() => onSelectEpisode(ep.number)}
                  className={`w-full text-left rounded-2xl p-2 transition flex items-center gap-3 border cursor-pointer ${
                    isCurrent
                      ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/50'
                      : 'bg-[#050507]/60 hover:bg-[#14141F] border-slate-800/80'
                  }`}
                >
                  {/* Episode Thumbnail */}
                  <div className="relative w-24 aspect-video rounded-xl overflow-hidden shrink-0 bg-slate-900">
                    <img
                      src={coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80'}
                      alt={ep.title}
                      className="w-full h-full object-cover"
                    />
                    {isCurrent && (
                      <div className="absolute inset-0 bg-purple-950/70 backdrop-blur-[1px] flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Title & Duration */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-bold line-clamp-1 ${isCurrent ? 'text-purple-300 font-black' : 'text-slate-200'}`}>
                        <span className="mr-1">{ep.number}</span>
                        {ep.title}
                      </h4>
                      {isCurrent && (
                        <BarChart2 className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">{ep.duration || 24}m</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* Related Tab View */
        <div className="py-6 text-center text-xs text-slate-400">
          No related seasons currently available.
        </div>
      )}
    </div>
  );
}
