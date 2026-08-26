import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAnimeDetails } from '../services/anilist/client';
import { getNormalizedEpisodes, NormalizedEpisode } from '../services/episodes/episodes';
import { resolveParallelSources, prefetchNextEpisodeSources } from '../services/streaming/resolver';
import { NormalizedStreamResponse, StreamingSource } from '../services/streaming/providerTypes';
import { useAuth } from '../context/AuthContext';
import { addToWatchlist, getWatchlist, updateWatchProgress, getWatchHistory, getUserAudioPreference, setUserAudioPreference, syncAllUserPreferencesToSupabase } from '../services/userStore';

import YomiVideoPlayer from '../components/player/YomiVideoPlayer';
import ServerSelector from '../components/player/ServerSelector';
import SubDubControls from '../components/player/SubDubControls';
import YouAreWatchingCard from '../components/player/YouAreWatchingCard';
import RightEpisodeSidebar from '../components/player/RightEpisodeSidebar';
import CommentsSection from '../components/player/CommentsSection';

import { ChevronLeft, RefreshCw } from 'lucide-react';
import { AnimeMedia } from '../types/anime';

export default function WatchPage() {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();

  const animeId = parseInt(id || '151807', 10);
  const currentEpNum = parseInt(episode || '1', 10);

  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [normalizedEpisodes, setNormalizedEpisodes] = useState<NormalizedEpisode[]>([]);
  const [streamResponse, setStreamResponse] = useState<NormalizedStreamResponse | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Sync Audio Preference with Profile Preferences or Local Preference
  const initialAudio = profile?.preferences?.preferredAudio || getUserAudioPreference();
  const [audioVariant, setAudioVariant] = useState<'sub' | 'dub'>(initialAudio);

  // Automatically update active audio variant when profile loads from Supabase
  useEffect(() => {
    if (profile?.preferences?.preferredAudio) {
      setAudioVariant(profile.preferences.preferredAudio);
    }
  }, [profile?.preferences?.preferredAudio]);

  const [streamError, setStreamError] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
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
          animeData.idMal,
          animeData.streamingEpisodes,
          animeData.status,
          animeData.nextAiringEpisode
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
        if (past && past.currentTime > 5) {
          setResumeTime(past.currentTime);
          setShowResumeBadge(true);
        } else {
          setResumeTime(0);
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

  const handleAudioChange = async (variant: 'sub' | 'dub') => {
    setAudioVariant(variant);
    setUserAudioPreference(variant);

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

  const handleSwitchMirror = () => {
    setStreamError(false);
    if (streamResponse && streamResponse.sources.length > 1) {
      setActiveSourceIndex((prev) => (prev + 1) % streamResponse.sources.length);
    }
  };

  const handleSelectServerIndex = (index: number) => {
    setStreamError(false);
    if (streamResponse && index >= 0 && index < streamResponse.sources.length) {
      setActiveSourceIndex(index);
    }
  };

  const activeSource: StreamingSource | null =
    streamResponse && streamResponse.sources[activeSourceIndex]
      ? streamResponse.sources[activeSourceIndex]
      : streamResponse?.firstValidSource || null;

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
    if (anime && cur > 2) {
      updateWatchProgress(anime, currentEpNum, cur, dur || 1430);
    }
  };

  // Prefetch Episode N+1
  useEffect(() => {
    if (anime) {
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
          {streamResponse && streamResponse.sources.length > 1 && (
            <button
              onClick={handleSwitchMirror}
              className="bg-[#0D0D12] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              <span>Switch Mirror ({activeSourceIndex + 1}/{streamResponse.sources.length})</span>
            </button>
          )}
          <span className="bg-purple-950/60 border border-purple-800/80 text-purple-300 text-xs font-black px-3 py-1.5 rounded-xl uppercase">
            1080p Ultra HD
          </span>
        </div>
      </div>

      {/* Resume Playback Badge */}
      {showResumeBadge && resumeTime && (
        <div className="bg-purple-950/40 border border-purple-800/80 text-purple-300 text-xs p-3 rounded-2xl flex items-center justify-between shadow-lg">
          <span className="font-bold">
            Resume playback from <span className="text-white font-black">{formatTime(resumeTime)}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResumeBadge(false)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
            >
              Resume ({formatTime(resumeTime)})
            </button>
            <button
              onClick={() => setShowResumeBadge(false)}
              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Player & Metadata */}
        <div className="lg:col-span-2 space-y-6">
          <YomiVideoPlayer
            source={activeSource}
            title={title}
            episodeNumber={currentEpNum}
            initialTime={resumeTime || 0}
            onTimeUpdate={handleTimeUpdate}
            skipIntroEnabled={profile?.preferences?.skipIntro || false}
            skipOutroEnabled={profile?.preferences?.skipOutro || false}
            onSwitchMirror={handleSwitchMirror}
            onEnded={() => handleSelectEpisode(currentEpNum + 1)}
          />

          {/* Interactive Server Selector Tabs */}
          {streamResponse && streamResponse.servers && (
            <ServerSelector
              servers={streamResponse.servers}
              activeSourceIndex={activeSourceIndex}
              onSelectServer={handleSelectServerIndex}
              audioVariant={audioVariant}
              onAudioChange={handleAudioChange}
              episodeNumber={currentEpNum}
            />
          )}

          <SubDubControls
            audioVariant={audioVariant}
            onAudioChange={handleAudioChange}
            inWatchlist={inWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onSwitchMirror={handleSwitchMirror}
          />

          <YouAreWatchingCard
            title={title}
            epTitle={epTitle}
            currentEpNum={currentEpNum}
            score={score}
            year={year}
            format={anime?.format || 'TV'}
            genres={anime?.genres || ['Action', 'Fantasy']}
            description={anime?.description || ''}
          />

          <CommentsSection />
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
