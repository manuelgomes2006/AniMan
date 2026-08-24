import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAnimeDetails } from '../services/anilist/client';
import { getNormalizedEpisodes, NormalizedEpisode } from '../services/episodes/episodes';
import { getAniLinkStreamUrl } from '../services/streaming/anilink';
import {
  getUserAudioPreference,
  setUserAudioPreference,
  updateWatchProgress
} from '../services/userStore';
import { AnimeMedia } from '../types/anime';

import SubDubControls from '../components/player/SubDubControls';
import ServerSelector from '../components/player/ServerSelector';
import ErrorState from '../components/shared/ErrorState';

import {
  ChevronLeft, ChevronRight, Play, Star, Plus, Check, Server, RefreshCw
} from 'lucide-react';

export default function WatchPage() {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const navigate = useNavigate();

  const animeId = parseInt(id || '1', 10);
  const currentEpNum = parseInt(episode || '1', 10);

  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [normalizedEpisodes, setNormalizedEpisodes] = useState<NormalizedEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioVariant, setAudioVariant] = useState<'sub' | 'dub'>(getUserAudioPreference());
  const [selectedServer, setSelectedServer] = useState('server-1');
  const [streamError, setStreamError] = useState(false);

  // Load Anime Metadata & Normalized MAL Episode List
  useEffect(() => {
    async function loadWatchData() {
      setLoading(true);
      setStreamError(false);
      try {
        const animeData = await getAnimeDetails(animeId);
        setAnime(animeData);

        const episodesData = await getNormalizedEpisodes(
          animeId,
          animeData.episodes || 12,
          animeData.idMal
        );
        setNormalizedEpisodes(episodesData);
      } catch (err) {
        console.error('Watch data load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWatchData();
  }, [animeId]);

  const currentEpData = normalizedEpisodes.find(ep => ep.number === currentEpNum) || {
    number: currentEpNum,
    title: `Episode ${currentEpNum}`,
    playable: true,
    subAvailable: true,
    dubAvailable: true
  };

  const handleAudioChange = (variant: 'sub' | 'dub') => {
    setAudioVariant(variant);
    setUserAudioPreference(variant);
  };

  const handleNextEpisode = () => {
    const nextNum = currentEpNum + 1;
    if (nextNum <= (normalizedEpisodes.length || 24)) {
      navigate(`/watch/${animeId}/${nextNum}`);
    }
  };

  const handlePrevEpisode = () => {
    if (currentEpNum > 1) {
      navigate(`/watch/${animeId}/${currentEpNum - 1}`);
    }
  };

  // Build stream embed URL
  const streamUrl = getAniLinkStreamUrl({
    animeId,
    episode: currentEpNum,
    variant: audioVariant,
    server: selectedServer
  });

  const title = anime?.title?.english || anime?.title?.romaji || 'Anime';
  const cover = anime?.coverImage?.large || anime?.coverImage?.medium;

  // Track watch progress periodically
  useEffect(() => {
    if (anime) {
      updateWatchProgress(anime, currentEpNum, 120, 1440);
    }
  }, [anime, currentEpNum]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 space-y-4">
        <div className="w-full aspect-video bg-[#0D0D12] rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Mobile Top Control Header (< 768px) */}
      <div className="flex items-center justify-between md:hidden pb-1 border-b border-slate-900">
        <Link to={`/anime/${animeId}`} className="flex items-center gap-1 text-slate-300 hover:text-white text-xs font-bold">
          <ChevronLeft className="w-4 h-4 text-purple-400" />
          <span className="line-clamp-1 max-w-[180px]">{title}</span>
        </Link>
        <span className="text-[10px] font-black text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-800/40">
          EP {currentEpNum}
        </span>
      </div>

      {/* Main Video Player Container */}
      <div className="relative w-full aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-900 group">
        {streamError ? (
          <ErrorState
            title="Streaming Source Unavailable"
            message="The current server is unable to play this stream. Try switching to a backup server."
            onRetry={() => setStreamError(false)}
            onChangeServer={() => setSelectedServer(selectedServer === 'server-1' ? 'server-2' : 'server-1')}
          />
        ) : (
          <iframe
            src={streamUrl}
            title={`${title} - Episode ${currentEpNum}`}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; presentation"
            allowFullScreen
            onError={() => setStreamError(true)}
          />
        )}
      </div>

      {/* Touch Control Bar Below Player */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* SUB/DUB Audio Selector */}
        <div className="md:col-span-1">
          <SubDubControls
            currentVariant={audioVariant}
            onSelectVariant={handleAudioChange}
            hasDub={currentEpData.dubAvailable}
          />
        </div>

        {/* Server Selector */}
        <div className="md:col-span-2">
          <ServerSelector
            currentServer={selectedServer}
            onSelectServer={setSelectedServer}
          />
        </div>
      </div>

      {/* Touch Touch Next/Prev Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={handlePrevEpisode}
          disabled={currentEpNum <= 1}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition ${
            currentEpNum <= 1
              ? 'bg-[#0D0D12] text-slate-600 border border-slate-900 cursor-not-allowed'
              : 'bg-[#0D0D12] hover:bg-slate-900 text-slate-200 border border-slate-800'
          }`}
        >
          <ChevronLeft className="w-4 h-4 text-purple-400" />
          <span>Previous Episode</span>
        </button>

        <button
          onClick={handleNextEpisode}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/60 transition"
        >
          <span>Next Episode</span>
          <ChevronRight className="w-4 h-4 fill-white" />
        </button>
      </div>

      {/* Episodes Catalog List Below Player */}
      <section className="space-y-3 pt-3">
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
            Episodes Catalog ({normalizedEpisodes.length} Total)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {normalizedEpisodes.map((ep) => {
            const isCurrent = ep.number === currentEpNum;
            return (
              <button
                key={ep.number}
                onClick={() => navigate(`/watch/${animeId}/${ep.number}`)}
                className={`w-full text-left rounded-xl overflow-hidden flex items-center gap-2.5 p-2 transition border ${
                  isCurrent
                    ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/40'
                    : 'bg-[#0D0D12] hover:bg-slate-900 border-slate-900'
                }`}
              >
                <div className="relative w-20 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-950">
                  <img src={cover} alt={ep.title} className="w-full h-full object-cover" />
                  {isCurrent && (
                    <div className="absolute inset-0 bg-purple-900/60 backdrop-blur-[1px] flex items-center justify-center">
                      <Play className="w-4 h-4 fill-white text-white animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isCurrent ? 'text-purple-400' : 'text-slate-400'}`}>
                      EPISODE {ep.number}
                    </span>
                    {ep.isFiller && (
                      <span className="text-[8px] font-bold text-amber-400 bg-amber-950/60 px-1 rounded">
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
      </section>
    </div>
  );
}
