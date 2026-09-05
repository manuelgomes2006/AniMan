import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAnimeDetails } from '../services/anilist/client';
import { getNormalizedEpisodes, NormalizedEpisode } from '../services/episodes/episodes';
import {
  resolveEpisodeLanguageSources,
  getAvailableLanguage,
  prefetchNextEpisodeSources
} from '../services/streaming/resolver';
import {
  EpisodeSource,
  Language,
  ResolvedEpisodeData
} from '../services/streaming/providerTypes';
import { useAuth } from '../context/AuthContext';
import {
  addToWatchlist,
  getWatchlist,
  updateWatchProgress,
  getWatchHistory,
  fetchWatchHistoryFromSupabase,
  getUserAudioPreference,
  setUserAudioPreference,
  syncAllUserPreferencesToSupabase
} from '../services/userStore';

import YomiVideoPlayer from '../components/player/YomiVideoPlayer';
import ServerSelector from '../components/player/ServerSelector';
import YouAreWatchingCard from '../components/player/YouAreWatchingCard';
import RightEpisodeSidebar from '../components/player/RightEpisodeSidebar';

import { isAllowedAnime } from '../services/catalog/contentFilter';
import { ChevronLeft, RefreshCw, ShieldAlert, AlertTriangle } from 'lucide-react';
import { AnimeMedia } from '../types/anime';

export default function WatchPage() {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();

  const animeId = parseInt(id || '151807', 10);
  const currentEpNum = parseInt(episode || '1', 10);

  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [normalizedEpisodes, setNormalizedEpisodes] = useState<NormalizedEpisode[]>([]);
  const [resolvedEpisode, setResolvedEpisode] = useState<ResolvedEpisodeData | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Persistent User Audio Preference ('sub' | 'dub')
  const initialPref = (profile?.preferences?.preferredAudio || getUserAudioPreference() || 'sub') as Language;
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(initialPref);

  // Effective Active Language for Current Episode ('sub' | 'dub' | null)
  const [activeLanguage, setActiveLanguage] = useState<Language | null>(null);

  const [dubFallbackAlert, setDubFallbackAlert] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [showResumeBadge, setShowResumeBadge] = useState(false);

  // Update preferred language when profile finishes loading
  useEffect(() => {
    if (profile?.preferences?.preferredAudio) {
      setPreferredLanguage(profile.preferences.preferredAudio as Language);
    }
  }, [profile?.preferences?.preferredAudio]);

  // Ensure WatchPage always lands at the top showing the Video Player first
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [animeId, currentEpNum]);

  // Load Anime Metadata, Normalized Episodes, & Language Sources
  useEffect(() => {
    async function loadWatchData() {
      setLoading(true);
      setDubFallbackAlert(null);
      try {
        const animeData = await getAnimeDetails(animeId);
        if (!animeData || !isAllowedAnime(animeData)) {
          setAnime(null);
          return;
        }
        setAnime(animeData);

        const episodesData = await getNormalizedEpisodes(
          animeId,
          animeData.episodes,
          animeData.idMal,
          animeData.streamingEpisodes,
          animeData.status,
          animeData.nextAiringEpisode,
          animeData.title?.english || animeData.title?.romaji
        );
        setNormalizedEpisodes(episodesData);

        // Fetch SUB & DUB episode sources in parallel
        const resolvedData = await resolveEpisodeLanguageSources({
          animeId,
          title: animeData.title?.english || animeData.title?.romaji || 'Anime',
          episode: currentEpNum,
          malId: animeData.idMal,
        });

        setResolvedEpisode(resolvedData);
        setActiveSourceIndex(0);

        // Determine active language using getAvailableLanguage
        const nextLanguage = getAvailableLanguage(resolvedData, preferredLanguage);
        setActiveLanguage(nextLanguage);

        const list = getWatchlist();
        setInWatchlist(list.some(item => item.anime.id === animeId));

        // Check Resume History Timestamp from Supabase Cloud / Local Cache
        const history = await fetchWatchHistoryFromSupabase().catch(() => getWatchHistory());
        const past = history.find(h => h.animeId === animeId && h.episodeNumber === currentEpNum);
        if (past && past.currentTime > 5) {
          setResumeTime(past.currentTime);
          setShowResumeBadge(true);
        } else {
          setResumeTime(0);
          setShowResumeBadge(false);
        }
      } catch (err) {
        console.error('Watch data load error:', err);
        setResolvedEpisode(null);
        setActiveLanguage(null);
      } finally {
        setLoading(false);
      }
    }

    loadWatchData();
  }, [animeId, currentEpNum, preferredLanguage]);

  const hasSub = Boolean(resolvedEpisode?.hasSub);
  const hasDub = Boolean(resolvedEpisode?.hasDub);

  const activeLangSource = activeLanguage === 'dub'
    ? resolvedEpisode?.sources?.dub
    : resolvedEpisode?.sources?.sub;

  const activeEmbedUrl = activeLangSource?.embedUrl || null;

  const currentEpData = normalizedEpisodes.find(ep => ep.number === currentEpNum) || {
    number: currentEpNum,
    title: `Episode ${currentEpNum}`,
    playable: hasSub || hasDub,
    subAvailable: hasSub,
    dubAvailable: hasDub
  };

  const handleSelectLanguage = async (variant: Language) => {
    if (variant === 'dub' && !hasDub) return;

    setPreferredLanguage(variant);
    setUserAudioPreference(variant);
    setDubFallbackAlert(null);

    if (resolvedEpisode) {
      const nextLang = getAvailableLanguage(resolvedEpisode, variant);
      setActiveLanguage(nextLang);
    }

    if (profile?.id) {
      await syncAllUserPreferencesToSupabase(profile.id, {
        preferredAudio: variant,
        autoplay: profile.preferences?.autoplay,
        autoplayNext: profile.preferences?.autoplayNext,
        skipIntro: profile.preferences?.skipIntro,
        skipOutro: profile.preferences?.skipOutro,
      }).catch(() => {});
      await refreshProfile().catch(() => {});
    }
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

  const currentSourcesList: EpisodeSource[] = activeLangSource?.sources || [];

  const handleSwitchMirror = () => {
    if (currentSourcesList.length > 1) {
      setActiveSourceIndex((prev) => (prev + 1) % currentSourcesList.length);
    } else if (activeLanguage === 'dub' && hasSub) {
      // Fallback if Dub fails to load
      setActiveLanguage('sub');
      setDubFallbackAlert('Dub unavailable. Switched to Sub.');
    }
  };

  const handleSelectServerIndex = (index: number) => {
    if (index >= 0 && index < currentSourcesList.length) {
      setActiveSourceIndex(index);
    }
  };

  const activeSourceItem: EpisodeSource | null =
    currentSourcesList[activeSourceIndex] ||
    (activeEmbedUrl
      ? {
          episodeId: `${animeId}-${currentEpNum}`,
          provider: activeLangSource?.provider || 'anilink',
          providerName: activeLangSource?.providerName || 'AniLink HD',
          language: activeLanguage || 'sub',
          type: 'iframe',
          url: activeEmbedUrl,
          quality: '1080p',
          status: 'available',
        }
      : null);

  const title = anime?.title?.english || anime?.title?.romaji || 'Anime';
  const epTitle = currentEpData.title || `Episode ${currentEpNum}`;
  const score = anime?.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.5';
  const year = anime?.seasonYear || 2024;
  const cover = anime?.coverImage?.extraLarge || anime?.coverImage?.large || anime?.coverImage?.medium;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Real-time playback position update to Watch History
  const handleTimeUpdate = (cur: number, dur: number) => {
    const defaultDur = anime?.duration ? anime.duration * 60 : 1440;
    const actualDuration = (dur && dur > 60) ? dur : defaultDur;

    if (anime && cur >= 0) {
      updateWatchProgress(anime, currentEpNum, cur, actualDuration);
    }
  };

  // Prefetch Episode N+1
  useEffect(() => {
    if (anime) {
      prefetchNextEpisodeSources({
        animeId,
        title,
        episode: currentEpNum,
        variant: preferredLanguage,
        malId: anime.idMal
      });
    }
  }, [anime, currentEpNum, preferredLanguage]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 space-y-6">
        <div className="w-full aspect-video bg-[#0D0D12] rounded-3xl animate-pulse flex flex-col items-center justify-center space-y-2">
          <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-xs text-purple-400 font-bold">Loading video player...</span>
        </div>
      </div>
    );
  }

  if (!anime || !isAllowedAnime(anime)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-rose-950/40 border border-rose-800/80 rounded-2xl flex items-center justify-center text-rose-400 mb-4 shadow-xl">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">Anime Not Available</h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
          The video stream you are looking for is restricted or not available on AniMan.
        </p>
        <Link
          to="/"
          className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-lg transition"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 font-sans text-white">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <Link
          to="/browse"
          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-extrabold transition"
        >
          <ChevronLeft className="w-4 h-4 text-purple-400" />
          <span>Back to Browse</span>
        </Link>

        {/* Top Quality & Mirror Switcher */}
        <div className="flex items-center gap-2">
          {currentSourcesList.length > 1 && (
            <button
              onClick={handleSwitchMirror}
              className="bg-[#0D0D12] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              <span>Switch Mirror ({activeSourceIndex + 1}/{currentSourcesList.length})</span>
            </button>
          )}
          <span className="bg-purple-950/60 border border-purple-800/80 text-purple-300 text-xs font-black px-3 py-1.5 rounded-xl uppercase">
            1080p Ultra HD
          </span>
        </div>
      </div>

      {/* Dub Fallback Alert Banner */}
      {dubFallbackAlert && (
        <div className="bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{dubFallbackAlert}</span>
          </div>
          <button
            onClick={() => setDubFallbackAlert(null)}
            className="text-amber-400 hover:text-white text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}



      {/* Main 2-Column Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Player & Metadata */}
        <div className="lg:col-span-2 space-y-6">
          {!activeEmbedUrl ? (
            <div className="w-full aspect-video bg-[#0D0D12] border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 shadow-2xl">
              <div className="w-12 h-12 bg-amber-950/60 border border-amber-800/80 rounded-2xl flex items-center justify-center text-amber-400 shadow-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">No playable source available for this episode.</h3>
              <p className="text-xs text-slate-400 max-w-md">
                We could not locate an active stream for Episode {currentEpNum}. Please try selecting another episode or audio language.
              </p>
            </div>
          ) : (
            <YomiVideoPlayer
              source={activeSourceItem}
              title={title}
              episodeNumber={currentEpNum}
              initialTime={resumeTime || 0}
              mediaDuration={anime?.duration}
              onTimeUpdate={handleTimeUpdate}
              skipIntroEnabled={profile?.preferences?.skipIntro || false}
              skipOutroEnabled={profile?.preferences?.skipOutro || false}
              onSwitchMirror={handleSwitchMirror}
              onEnded={() => handleSelectEpisode(currentEpNum + 1)}
            />
          )}

          {/* Interactive Server Selector Tabs */}
          {activeLangSource?.servers && activeLangSource.servers.length > 0 && (
            <ServerSelector
              servers={activeLangSource.servers}
              activeSourceIndex={activeSourceIndex}
              onSelectServer={handleSelectServerIndex}
              audioVariant={activeLanguage || 'sub'}
              onAudioChange={handleSelectLanguage}
              episodeNumber={currentEpNum}
              hasSub={hasSub}
              hasDub={hasDub}
            />
          )}

          <YouAreWatchingCard
            animeTitle={title}
            epTitle={epTitle}
            episodeNumber={currentEpNum}
            coverImage={cover}
          />
        </div>

        {/* Right Column: Episode Sidebar */}
        <div className="lg:col-span-1">
          <RightEpisodeSidebar
            episodes={normalizedEpisodes}
            currentEpNum={currentEpNum}
            onSelectEpisode={handleSelectEpisode}
            coverImage={cover}
            totalEpisodes={anime?.episodes || normalizedEpisodes.length}
          />
        </div>
      </div>
    </div>
  );
}
