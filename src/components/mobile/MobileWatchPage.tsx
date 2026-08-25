import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NormalizedEpisode } from '../../services/episodes/episodes';
import { NormalizedStreamResponse, StreamingSource } from '../../services/streaming/providerTypes';
import { AnimeMedia } from '../../types/anime';
import ErrorState from '../shared/ErrorState';
import YomiVideoPlayer from '../player/YomiVideoPlayer';
import ServerSelector from '../player/ServerSelector';

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
  ChevronDown,
  RefreshCw
} from 'lucide-react';

interface MobileWatchPageProps {
  anime: AnimeMedia | null;
  currentEpNum: number;
  episodes: NormalizedEpisode[];
  streamResponse: NormalizedStreamResponse | null;
  activeSource: StreamingSource | null;
  activeSourceIndex?: number;
  onSelectServer?: (index: number) => void;
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
  activeSourceIndex = 0,
  onSelectServer,
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

  const title = anime?.title?.english || anime?.title?.romaji || 'Solo Leveling';
  const currentEpData = episodes.find(ep => ep.number === currentEpNum) || {
    number: currentEpNum,
    title: `Episode ${currentEpNum}`,
    duration: 24,
    dubAvailable: true
  };

  const epTitle = currentEpData.title || `Episode ${currentEpNum}`;
  const cover = anime?.coverImage?.extraLarge || anime?.coverImage?.large || anime?.coverImage?.medium;

  const handleNextEpisode = () => {
    onSelectEpisode(currentEpNum + 1);
  };

  return (
    <div className="space-y-4 pb-20 text-white font-sans">
      {/* 1. Mobile Top Header Bar */}
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
          <button onClick={onSwitchMirror} title="Switch Stream Mirror" className="hover:text-purple-400 flex items-center gap-1 text-[11px] font-bold cursor-pointer bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span>Mirror</span>
          </button>
          <button className="hover:text-white cursor-pointer"><Cast className="w-4 h-4" /></button>
          <button className="hover:text-white cursor-pointer"><MoreVertical className="w-4 h-4" /></button>
        </div>
      </div>

      {/* 2. Mobile Video Player Container */}
      <div className="w-full">
        {streamError || !activeSource ? (
          <ErrorState
            title="Streaming Source Unavailable"
            message="This stream mirror is currently unresponsive. Tap Retry to try an alternative stream."
            onRetry={onRetryStream}
          />
        ) : (
          <YomiVideoPlayer
            source={activeSource}
            title={title}
            episodeNumber={currentEpNum}
            onSwitchMirror={onSwitchMirror}
            onEnded={handleNextEpisode}
          />
        )}
      </div>

      {/* Interactive Mobile Server Selector */}
      {streamResponse && streamResponse.servers && onSelectServer && (
        <div className="px-1">
          <ServerSelector
            servers={streamResponse.servers}
            activeSourceIndex={activeSourceIndex}
            onSelectServer={onSelectServer}
            audioVariant={audioVariant}
            onAudioChange={onAudioChange}
            episodeNumber={currentEpNum}
          />
        </div>
      )}

      {/* 3. Anime Details & Action Buttons */}
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

        {/* Quick Action Row: + Watchlist | 👍 Like | 🔗 Share | 🔄 Switch Mirror */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs font-bold text-slate-300 border-b border-slate-900 pb-3">
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

          <button
            onClick={onSwitchMirror}
            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Server</span>
          </button>
        </div>
      </div>

      {/* 4. AUDIO Section */}
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

      {/* 5. EPISODES Section */}
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
            const thumbSrc = ep.thumbnail || cover || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80';
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
                    <img
                      src={thumbSrc}
                      alt={ep.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = cover || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80';
                      }}
                    />
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
