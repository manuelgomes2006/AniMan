import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAnimeDetails } from '../services/anilist/client';
import { getNormalizedEpisodes, NormalizedEpisode } from '../services/episodes/episodes';
import {
  resolveParallelSources,
  prefetchNextEpisodeSources
} from '../services/streaming/resolver';
import { NormalizedStreamResponse, StreamingSource } from '../services/streaming/providerTypes';
import {
  getUserAudioPreference,
  setUserAudioPreference,
  updateWatchProgress
} from '../services/userStore';
import { AnimeMedia } from '../types/anime';

import SubDubControls from '../components/player/SubDubControls';
import EpisodeSelector from '../components/player/EpisodeSelector';
import ErrorState from '../components/shared/ErrorState';

import { ChevronLeft, ChevronRight, Play, RefreshCw } from 'lucide-react';

export default function WatchPage() {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const navigate = useNavigate();

  const animeId = parseInt(id || '1', 10);
  const currentEpNum = parseInt(episode || '1', 10);

  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [normalizedEpisodes, setNormalizedEpisodes] = useState<NormalizedEpisode[]>([]);
  const [streamResponse, setStreamResponse] = useState<NormalizedStreamResponse | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [audioVariant, setAudioVariant] = useState<'sub' | 'dub'>(getUserAudioPreference());
  const [streamError, setStreamError] = useState(false);

  // Load Anime Metadata, Normalized MAL Episodes, & Parallel Sources
  useEffect(() => {
    async function loadWatchData() {
      setLoading(true);
      setStreamError(false);
      try {
        const animeData = await getAnimeDetails(animeId);
        setAnime(animeData);

        const [episodesData, resolvedStreams] = await Promise.all([
          getNormalizedEpisodes(animeId, animeData.episodes || 12, animeData.idMal),
          resolveParallelSources({
            animeId,
            title: animeData.title?.english || animeData.title?.romaji || 'Anime',
            episode: currentEpNum,
            variant: audioVariant,
            malId: animeData.idMal
          })
        ]);

        setNormalizedEpisodes(episodesData);
        setStreamResponse(resolvedStreams);
        setActiveSourceIndex(0);
      } catch (err) {
        console.error('Watch data load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWatchData();
  }, [animeId, currentEpNum, audioVariant]);

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

  // Switch to next valid source on error fallback
  const handleSwitchMirror = () => {
    setStreamError(false);
    if (streamResponse && streamResponse.sources.length > 1) {
      setActiveSourceIndex((prev) => (prev + 1) % streamResponse.sources.length);
    }
  };

  const activeSource: StreamingSource | null =
    streamResponse && streamResponse.sources[activeSourceIndex]
      ? streamResponse.sources[activeSourceIndex]
      : streamResponse?.firstValidSource || null;

  const title = anime?.title?.english || anime?.title?.romaji || 'Anime';
  const cover = anime?.coverImage?.large || anime?.coverImage?.medium;

  // Track watch progress & prefetch Episode N+1 readiness when watching
  useEffect(() => {
    if (anime) {
      updateWatchProgress(anime, currentEpNum, 120, 1440);
      // Prefetch Episode N+1 source readiness
      prefetchNextEpisodeSources({
        animeId,
        title,
        episode: currentEpNum,
        variant: audioVariant,
        malId: anime.idMal
      });
    }
  }, [anime, currentEpNum, audioVariant]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 space-y-4">
        <div className="w-full aspect-video bg-[#0D0D12] rounded-3xl animate-pulse flex items-center justify-center">
          <span className="text-xs text-purple-400 font-bold animate-pulse">Resolving fastest stream source...</span>
        </div>
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

      {/* Main High-Speed Video Player Container */}
      <div className="relative w-full aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-900 group">
        {streamError || !activeSource ? (
          <ErrorState
            title="Streaming Source Unavailable"
            message="This stream mirror is currently unresponsive. Click Switch Source to try an alternative stream."
            onRetry={handleSwitchMirror}
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
            onError={() => setStreamError(true)}
          />
        )}
      </div>

      {/* Touch Control Bar Below Player */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-auto min-w-[200px]">
          <SubDubControls
            currentVariant={audioVariant}
            onSelectVariant={handleAudioChange}
            hasDub={currentEpData.dubAvailable}
          />
        </div>

        {/* Action Controls: Switch Source & Next/Prev Navigation */}
        <div className="flex items-center gap-2">
          {streamResponse && streamResponse.sources.length > 1 && (
            <button
              onClick={handleSwitchMirror}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0D0D12] hover:bg-slate-900 text-purple-300 border border-slate-800 transition flex items-center gap-1.5"
              title="Switch Mirror Source"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Switch Stream Source</span>
            </button>
          )}

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
