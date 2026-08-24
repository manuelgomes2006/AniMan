import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  updateWatchProgress,
  addToWatchlist,
  getWatchlist,
  getWatchHistory
} from '../services/userStore';
import { AnimeMedia } from '../types/anime';

import SubDubControls from '../components/player/SubDubControls';
import RightEpisodeSidebar from '../components/player/RightEpisodeSidebar';
import CommentsSection from '../components/player/CommentsSection';
import YouAreWatchingCard from '../components/player/YouAreWatchingCard';
import ErrorState from '../components/shared/ErrorState';
import MobileWatchPage from '../components/mobile/MobileWatchPage';

import {
  ChevronLeft,
  RefreshCw,
  Play,
  Star,
  Plus,
  Heart,
  AlertTriangle,
  Check,
  RotateCcw
} from 'lucide-react';

export default function WatchPage() {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const animeId = parseInt(id || '151807', 10);
  const currentEpNum = parseInt(episode || '6', 10);

  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [normalizedEpisodes, setNormalizedEpisodes] = useState<NormalizedEpisode[]>([]);
  const [streamResponse, setStreamResponse] = useState<NormalizedStreamResponse | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Sync Audio Preference with Profile Preferences or Local Preference
  const initialAudio = profile?.preferences?.preferredAudio || getUserAudioPreference();
  const [audioVariant, setAudioVariant] = useState<'sub' | 'dub'>(initialAudio);

  const [streamError, setStreamError] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [showResumeBadge, setShowResumeBadge] = useState(false);

  // Load Anime Metadata, Normalized Episodes, & Streams
  useEffect(() => {
    async function loadWatchData() {
      setLoading(true);
      setStreamError(false);
      try {
        const animeData = await getAnimeDetails(animeId);
        setAnime(animeData);

        const episodesData = await getNormalizedEpisodes(
          animeId,
          animeData.episodes,
          animeData.idMal
        );

        const resolvedStreams = await resolveParallelSources({
          animeId,
          title: animeData.title?.english || animeData.title?.romaji || 'Anime',
          episode: currentEpNum,
          variant: audioVariant,
          malId: animeData.idMal
        });

        setNormalizedEpisodes(episodesData);
        setStreamResponse(resolvedStreams);
        setActiveSourceIndex(0);

        const list = getWatchlist();
        setInWatchlist(list.some(item => item.anime.id === animeId));

        // Check Resume History Timestamp
        const history = getWatchHistory();
        const past = history.find(h => h.animeId === animeId && h.episodeNumber === currentEpNum);
        if (past && past.currentTime > 10) {
          setResumeTime(past.currentTime);
          setShowResumeBadge(true);
        } else {
          setShowResumeBadge(false);
        }
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

  const handleToggleWatchlist = () => {
    if (anime) {
      addToWatchlist(anime, 'watching');
      setInWatchlist(true);
    }
  };

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

  const title = anime?.title?.english || anime?.title?.romaji || 'Solo Leveling';
  const epTitle = currentEpData.title || `Episode ${currentEpNum}`;
  const score = anime?.averageScore ? (anime.averageScore / 10).toFixed(1) : '9.3';
  const year = anime?.seasonYear || 2024;
  const cover = anime?.coverImage?.large || anime?.coverImage?.extraLarge;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Track watch progress & prefetch Episode N+1
  useEffect(() => {
    if (anime) {
      updateWatchProgress(anime, currentEpNum, resumeTime || 877, 1430);
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
      <div className="max-w-7xl mx-auto py-8 space-y-6">
        <div className="w-full aspect-video bg-[#0D0D12] rounded-3xl animate-pulse flex items-center justify-center">
          <span className="text-xs text-purple-400 font-bold animate-pulse">Loading video player...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ============================================================ */}
      {/* 🖥️ DESKTOP WATCH PAGE LAYOUT (>= 1024px) - 100% UNCHANGED   */}
      {/* ============================================================ */}
      <div className="hidden lg:block space-y-6 pb-16">
        {/* Top Header Row: ← Back to Browse Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-extrabold transition"
          >
            <ChevronLeft className="w-4 h-4 text-purple-400" />
            <span>Back to Browse</span>
          </Link>

          {/* Top Quality Indicator */}
          <div className="flex items-center gap-2">
            <span className="bg-[#0D0D12] text-slate-300 text-[11px] font-bold px-3 py-1 rounded-xl border border-slate-800">
              Quality <span className="text-purple-400 ml-1">1080p</span>
            </span>
          </div>
        </div>

        {/* Desktop 2-Column Grid Layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column (Span 2): Video Player + Details + Comments */}
          <div className="col-span-2 space-y-6">
            <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-900 group">
              {/* Resume Playback Badge Overlay */}
              {showResumeBadge && resumeTime && (
                <div className="absolute top-3 left-3 z-30 bg-[#0D0D12]/95 backdrop-blur-md border border-purple-500/60 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-xl animate-fade-in">
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-extrabold text-white">
                    Resume from <span className="text-purple-400">{formatTime(resumeTime)}</span>
                  </span>
                  <button
                    onClick={() => setShowResumeBadge(false)}
                    className="ml-2 text-[10px] bg-purple-600 hover:bg-purple-500 text-white font-black px-2 py-0.5 rounded-lg shadow-md cursor-pointer"
                  >
                    Resume
                  </button>
                </div>
              )}

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

            {/* Audio Controls & Mirror Selector */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-[220px]">
                <SubDubControls
                  currentVariant={audioVariant}
                  onChangeVariant={handleAudioChange}
                  onSelectVariant={handleAudioChange}
                  isDubAvailable={currentEpData.dubAvailable}
                  hasDub={currentEpData.dubAvailable}
                />
              </div>

              {streamResponse && streamResponse.sources.length > 1 && (
                <button
                  onClick={handleSwitchMirror}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0D0D12] hover:bg-slate-900 text-purple-300 border border-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                  title="Switch Mirror Source"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Switch Stream Source</span>
                </button>
              )}
            </div>

            {/* Anime Title & Action Buttons Section */}
            <div className="bg-[#0D0D12]/90 border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{title}</h1>
                    <span className="p-1 rounded-lg bg-purple-950/80 border border-purple-800/40 text-purple-400">
                      <Play className="w-3.5 h-3.5 fill-purple-400" />
                    </span>
                  </div>

                  <p className="text-xs font-extrabold text-purple-400">
                    S1 • Ep {currentEpNum} <span className="text-slate-400 ml-1 font-semibold">{epTitle}</span>
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-xs font-extrabold text-slate-300">
                    <span className="flex items-center gap-1 text-purple-400">
                      <Star className="w-3.5 h-3.5 fill-purple-400" />
                      <span>{score}</span>
                    </span>
                    <span>•</span>
                    <span>24m</span>
                    <span>•</span>
                    <span>{year}</span>
                    <span>•</span>
                    <span>1080p</span>
                    <span>•</span>
                    <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] font-black text-slate-300 border border-slate-700">
                      CC
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-2 rounded-xl bg-[#050507] hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer"
                    title="Report Issue"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>

                  <button
                    onClick={handleToggleWatchlist}
                    className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-lg cursor-pointer ${
                      inWatchlist
                        ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/60'
                    }`}
                  >
                    {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{inWatchlist ? 'In List' : 'Add to List'}</span>
                  </button>

                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer ${
                      isFavorite
                        ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                        : 'bg-[#050507] hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Favorite"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-400' : ''}`} />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1 font-medium">
                {anime?.description?.replace(/<[^>]*>?/gm, '') ||
                  'Jinwoo faces a deadly double dungeon with a hidden quest. As the shadows grow stronger, he must unlock the true power within.'}
              </p>
            </div>

            <CommentsSection />
          </div>

          {/* Right Column (Span 1): Episode List Sidebar + You're Watching Card */}
          <div className="space-y-6">
            <RightEpisodeSidebar
              episodes={normalizedEpisodes}
              currentEpisode={currentEpNum}
              onSelectEpisode={handleSelectEpisode}
              coverImage={cover}
            />

            <YouAreWatchingCard
              title={title}
              episodeNumber={currentEpNum}
              coverImage={cover}
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 📱 MOBILE WATCH PAGE LAYOUT (< 1024px) - EXACT SCREENSHOT   */}
      {/* ============================================================ */}
      <div className="block lg:hidden">
        <MobileWatchPage
          anime={anime}
          currentEpNum={currentEpNum}
          episodes={normalizedEpisodes}
          streamResponse={streamResponse}
          activeSource={activeSource}
          audioVariant={audioVariant}
          onAudioChange={handleAudioChange}
          onSelectEpisode={handleSelectEpisode}
          onSwitchMirror={handleSwitchMirror}
          streamError={streamError}
          onRetryStream={handleSwitchMirror}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggleWatchlist}
        />
      </div>
    </>
  );
}
