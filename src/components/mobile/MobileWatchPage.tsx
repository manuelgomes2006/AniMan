import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { NormalizedEpisode } from '../../services/episodes/episodes';
import { NormalizedStreamResponse, StreamingSource } from '../../services/streaming/providerTypes';
import { AnimeMedia } from '../../types/anime';
import ErrorState from '../shared/ErrorState';

import {
  ChevronLeft,
  Cast,
  Download,
  MoreVertical,
  Play,
  Pause,
  Plus,
  ThumbsUp,
  Share2,
  Edit3,
  Check,
  BarChart2,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

interface MobileWatchPageProps {
  anime: AnimeMedia | null;
  currentEpNum: number;
  episodes: NormalizedEpisode[];
  streamResponse: NormalizedStreamResponse | null;
  activeSource: StreamingSource | null;
  audioVariant: 'sub' | 'dub';
  onAudioChange: (variant: 'sub' | 'dub') => void;
  onSelectEpisode: (epNum: number) => void;
  onSwitchMirror: () => void;
  streamError: boolean;
  onRetryStream: () => void;
  inWatchlist: boolean;
  onToggleWatchlist: () => void;
}

export default function MobileWatchPage({
  anime,
  currentEpNum,
  episodes,
  streamResponse,
  activeSource,
  audioVariant,
  onAudioChange,
  onSelectEpisode,
  onSwitchMirror,
  streamError,
  onRetryStream,
  inWatchlist,
  onToggleWatchlist
}: MobileWatchPageProps) {
  const navigate = useNavigate();
  const [activeServer, setActiveServer] = useState('vidstream');
  const [rangeIndex, setRangeIndex] = useState(0);

  const title = anime?.title?.english || anime?.title?.romaji || 'Solo Leveling';
  const totalCount = Math.max(episodes.length, currentEpNum, 12);
  const currentEpData = episodes.find(ep => ep.number === currentEpNum) || {
    number: currentEpNum,
    title: `Episode ${currentEpNum}`,
    duration: 24,
    dubAvailable: true
  };

  const epTitle = currentEpData.title || `Episode ${currentEpNum}`;
  const cover = anime?.coverImage?.large || anime?.coverImage?.medium;

  const handleNextEpisode = () => {
    onSelectEpisode(currentEpNum + 1);
  };

  return (
    <div className="space-y-4 pb-20 text-white font-sans">
      {/* 1. Mobile Top Header Bar matching Screenshot */}
      <div className="flex items-center justify-between py-1 px-1 border-b border-slate-900/80">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate(-1)} className="p-1 text-slate-300 hover:text-white cursor-pointer">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xs font-black text-white line-clamp-1">{title}</h2>
            <p className="text-[10px] text-slate-400 font-semibold">S1 • Ep {currentEpNum}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          <button className="hover:text-white cursor-pointer"><Cast className="w-4 h-4" /></button>
          <button className="hover:text-white cursor-pointer"><Download className="w-4 h-4" /></button>
          <button className="hover:text-white cursor-pointer"><MoreVertical className="w-4 h-4" /></button>
        </div>
      </div>

      {/* 2. Mobile Video Player Container */}
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-900">
        {streamError || !activeSource ? (
          <ErrorState
            title="Streaming Source Unavailable"
            message="This stream mirror is currently unresponsive. Tap Switch Source to try an alternative stream."
            onRetry={onRetryStream}
          />
        ) : (
          <iframe
            key={`${activeSource.url}-${audioVariant}`}
            src={activeSource.url}
            title={`${title} - Episode ${currentEpNum}`}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; presentation"
            allowFullScreen
            loading="eager"
            onError={onRetryStream}
          />
        )}
      </div>

      {/* 3. Anime Details & Action Buttons matching Screenshot */}
      <div className="space-y-3 px-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-base font-black text-white">{title}</h1>
            <p className="text-xs font-bold text-slate-400">S1 • Episode {currentEpNum}</p>
            <p className="text-xs font-bold text-purple-400">{epTitle}</p>
          </div>

          <button
            onClick={handleNextEpisode}
            className="bg-[#14141F] hover:bg-slate-800 border border-slate-800 text-white font-extrabold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-white text-white" />
            <span>Next Episode</span>
          </button>
        </div>

        {/* Quick Action Row: + Watchlist | 👍 Like | 🔗 Share */}
        <div className="flex items-center gap-5 pt-1 text-xs font-bold text-slate-300 border-b border-slate-900 pb-3">
          <button
            onClick={onToggleWatchlist}
            className={`flex items-center gap-1.5 transition cursor-pointer ${inWatchlist ? 'text-purple-400' : 'hover:text-white'}`}
          >
            <Plus className="w-4 h-4" />
            <span>{inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
          </button>

          <button className="flex items-center gap-1.5 hover:text-white transition cursor-pointer">
            <ThumbsUp className="w-4 h-4" />
            <span>Like</span>
          </button>

          <button className="flex items-center gap-1.5 hover:text-white transition cursor-pointer">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 4. AUDIO Section matching Screenshot */}
      <div className="space-y-2 px-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[11px]">AUDIO</span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Prefer Sub</span>
            <Edit3 className="w-3 h-3 text-slate-400" />
            <span className="text-purple-400 font-semibold flex items-center gap-0.5 ml-2">
              <Check className="w-3 h-3 text-purple-400" /> Default
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onAudioChange('sub')}
            className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
              audioVariant === 'sub'
                ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/60 font-black'
                : 'bg-[#0D0D12] border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span className="font-extrabold text-xs tracking-wide">SUB</span>
            <span className={`text-[9px] font-semibold uppercase mt-0.5 ${audioVariant === 'sub' ? 'text-purple-200' : 'text-slate-500'}`}>
              Japanese
            </span>
          </button>

          <button
            onClick={() => onAudioChange('dub')}
            className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
              audioVariant === 'dub'
                ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/60 font-black'
                : 'bg-[#0D0D12] border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span className="font-extrabold text-xs tracking-wide">DUB</span>
            <span className={`text-[9px] font-semibold uppercase mt-0.5 ${audioVariant === 'dub' ? 'text-purple-200' : 'text-slate-500'}`}>
              English
            </span>
          </button>
        </div>
      </div>

      {/* 5. SERVER Section matching Screenshot */}
      <div className="space-y-2 px-1 pt-1">
        <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[11px]">SERVER</span>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => { setActiveServer('vidstream'); onSwitchMirror(); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeServer === 'vidstream'
                ? 'bg-purple-950/60 border-purple-500 text-purple-300 ring-1 ring-purple-500/50'
                : 'bg-[#0D0D12] border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>VidStream</span>
            <BarChart2 className="w-3 h-3 text-purple-400 animate-pulse" />
          </button>

          <button
            onClick={() => { setActiveServer('streamsb'); onSwitchMirror(); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0D0D12] border border-slate-800 text-slate-400 hover:text-white shrink-0 cursor-pointer"
          >
            StreamSB
          </button>

          <button
            onClick={() => { setActiveServer('mycloud'); onSwitchMirror(); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0D0D12] border border-slate-800 text-slate-400 hover:text-white shrink-0 cursor-pointer"
          >
            MyCloud
          </button>

          <button
            onClick={() => { setActiveServer('doodstream'); onSwitchMirror(); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0D0D12] border border-slate-800 text-slate-400 hover:text-white shrink-0 cursor-pointer"
          >
            DoodStream
          </button>
        </div>
      </div>

      {/* 6. EPISODES Section matching Screenshot */}
      <div className="space-y-2.5 px-1 pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[11px]">EPISODES</span>
          <div className="flex items-center gap-1 text-slate-300 font-extrabold text-xs">
            <span>Season 1</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Vertical Episode Card Thread */}
        <div className="space-y-2">
          {episodes.map((ep) => {
            const isCurrent = ep.number === currentEpNum;
            return (
              <div
                key={ep.number}
                onClick={() => onSelectEpisode(ep.number)}
                className={`w-full rounded-2xl p-2.5 transition flex flex-col gap-2 border cursor-pointer ${
                  isCurrent
                    ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/50 shadow-md'
                    : 'bg-[#0D0D12] border-slate-800/80 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-20 aspect-video rounded-xl overflow-hidden shrink-0 bg-slate-950">
                    <img src={cover || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80'} alt={ep.title} className="w-full h-full object-cover" />
                    {isCurrent ? (
                      <div className="absolute inset-0 bg-purple-900/70 backdrop-blur-[1px] flex items-center justify-center">
                        <Pause className="w-4 h-4 text-white fill-white" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 text-white fill-white opacity-80" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className={`text-xs font-bold line-clamp-1 ${isCurrent ? 'text-purple-300 font-black' : 'text-slate-200'}`}>
                      Episode {ep.number}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1 font-medium">{ep.title}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{ep.duration || 24}m</p>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    {!isCurrent && <Download className="w-4 h-4 hover:text-white" />}
                    <MoreVertical className="w-4 h-4 hover:text-white" />
                  </div>
                </div>

                {/* Progress Bar for Active Playing Episode */}
                {isCurrent && (
                  <div className="space-y-1 pt-1 border-t border-purple-800/30">
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full w-[62%] rounded-full" />
                    </div>
                    <p className="text-[9px] text-purple-400 font-semibold text-right">14:37 / 23:50</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
