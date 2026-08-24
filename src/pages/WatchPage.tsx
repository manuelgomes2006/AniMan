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
import EpisodeSelector from '../components/player/EpisodeSelector';
import ErrorState from '../components/shared/ErrorState';

import { ChevronLeft, ChevronRight, Play, Star } from 'lucide-react';

export default function WatchPage() {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const navigate = useNavigate();

  const animeId = parseInt(id || '1', 10);
  const currentEpNum = parseInt(episode || '1', 10);

  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [normalizedEpisodes, setNormalizedEpisodes] = useState<NormalizedEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioVariant, setAudioVariant] = useState<'sub' | 'dub'>(getUserAudioPreference());
  const [streamError, setStreamError] = useState(false);

  // Load Anime Metadata & Accurate Episode List
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

  const handleSelectEpisode = (epNum: number) => {
    navigate(`/watch/${animeId}/${epNum}`);
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

  // High-speed stream embed URL resolution
  const streamUrl = getAniLinkStreamUrl({
    animeId,
    episode: currentEpNum,
    variant: audioVariant,
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
      {/* Pre-warm Stream Connection for Maximum Player Speed */}
      <link rel="preconnect" href="https://anilink.cc" />
      <link rel="dns-prefetch" href="https://anilink.cc" />

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

      {/* Main High-Speed Video Player Container */}
      <div className="relative w-full aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-900 group">
        {streamError ? (
          <ErrorState
            title="Streaming Source Unavailable"
            message="Unable to load this video stream. Click retry to refresh."
            onRetry={() => setStreamError(false)}
          />
        ) : (
          <iframe
            src={streamUrl}
            title={`${title} - Episode ${currentEpNum}`}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; presentation"
            allowFullScreen
            loading="eager"
            onError={() => setStreamError(true)}
          />
        )}
      </div>

      {/* Touch Control Bar Below Player (Audio Selector Only — Server details hidden as requested) */}
      <div className="flex items-center justify-between gap-3">
        <div className="w-full sm:w-auto min-w-[200px]">
          <SubDubControls
            currentVariant={audioVariant}
            onSelectVariant={handleAudioChange}
            hasDub={currentEpData.dubAvailable}
          />
        </div>

        {/* Quick Next/Prev Episode Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevEpisode}
            disabled={currentEpNum <= 1}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              currentEpNum <= 1
                ? 'bg-[#0D0D12] text-slate-600 border border-slate-900 cursor-not-allowed'
                : 'bg-[#0D0D12] hover:bg-slate-900 text-slate-200 border border-slate-800'
            }`}
            title="Previous Episode"
          >
            <ChevronLeft className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <button
            onClick={handleNextEpisode}
            className="px-4 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-md transition flex items-center gap-1"
            title="Next Episode"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4 fill-white" />
          </button>
        </div>
      </div>

      {/* Episode Selector Component Matching Screenshot */}
      <div className="pt-2">
        <EpisodeSelector
          episodes={normalizedEpisodes}
          currentEpisode={currentEpNum}
          onSelectEpisode={handleSelectEpisode}
          coverImage={cover}
        />
      </div>
    </div>
  );
}
