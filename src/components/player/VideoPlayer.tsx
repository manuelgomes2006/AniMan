import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, RotateCcw,
  RotateCw, Settings, Clock, ArrowLeft, Monitor, Subtitles, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveWatchProgress, getWatchProgress } from '../../services/userStore';
import { AnimeMedia } from '../../types/anime';
import { ServerOption } from '../../types/stream';

interface VideoPlayerProps {
  embedUrl?: string;
  fallbackHls?: string;
  servers?: ServerOption[];
  animeMeta?: AnimeMedia;
  episodeNumber: number;
  onEpisodeEnd?: () => void;
}

export default function VideoPlayer({
  embedUrl,
  fallbackHls,
  servers = [],
  animeMeta,
  episodeNumber,
  onEpisodeEnd
}: VideoPlayerProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [activeServer, setActiveServer] = useState<ServerOption | null>(servers[0] || null);
  const [useHls, setUseHls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<number | null>(null);
  const [hasAutoResumed, setHasAutoResumed] = useState(false);

  // Sync active server
  useEffect(() => {
    if (servers.length > 0) setActiveServer(servers[0]);
  }, [servers]);

  // Check saved progress
  useEffect(() => {
    if (animeMeta?.id && episodeNumber) {
      const saved = getWatchProgress(animeMeta.id, episodeNumber);
      if (saved && saved.currentTime > 15 && saved.currentTime < saved.duration - 30) {
        setResumePrompt(saved.currentTime);
      } else {
        setResumePrompt(null);
      }
    }
  }, [animeMeta?.id, episodeNumber]);

  // HLS stream loader
  useEffect(() => {
    if (!useHls && activeServer?.type === 'embed') return;
    const video = videoRef.current;
    if (!video) return;

    const streamUrl = activeServer?.url || fallbackHls;
    if (!streamUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [useHls, activeServer, fallbackHls]);

  // Auto-save watch progress
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && animeMeta?.id && episodeNumber && video.currentTime > 5 && video.duration > 0) {
        const title = animeMeta.title?.english || animeMeta.title?.romaji || 'Anime';
        const cover = animeMeta.coverImage?.extraLarge || animeMeta.coverImage?.large;
        saveWatchProgress(
          animeMeta.id,
          episodeNumber,
          Math.floor(video.currentTime),
          Math.floor(video.duration),
          title,
          cover
        );
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [animeMeta, episodeNumber]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleRewind = () => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
  };

  const handleForward = () => {
    if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    videoRef.current.muted = newMuteState;
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const applyResumeTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setHasAutoResumed(true);
      setResumePrompt(null);
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const h = Math.floor(m / 60);
    const displayM = m % 60;
    if (h > 0) {
      return `${h}:${displayM < 10 ? '0' : ''}${displayM}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${displayM}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentEmbedUrl = activeServer?.url || embedUrl;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 group select-none flex flex-col justify-center"
    >
      {/* Top Header Overlay Controls (Image 2 format) */}
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 z-30 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-bold text-white hover:text-purple-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur-md transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Browse
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-white flex items-center gap-1.5">
            <span>Quality</span>
            <span className="text-purple-400 font-extrabold">1080p</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl border border-slate-800 transition"
            title="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Video Source (Embed or HLS) */}
      {!useHls && currentEmbedUrl ? (
        <iframe
          src={currentEmbedUrl}
          title="AniWorld Player"
          allow="autoplay; fullscreen; picture-in-picture; presentation"
          allowFullScreen
          className="w-full h-full border-0 rounded-3xl"
          onError={() => setUseHls(true)}
        />
      ) : (
        <>
          <video
            ref={videoRef}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              setIsPlaying(false);
              if (onEpisodeEnd) onEpisodeEnd();
            }}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Resume Prompt Overlay */}
          {resumePrompt && !hasAutoResumed && (
            <div className="absolute top-14 left-4 z-40 bg-[#0D0D12]/95 backdrop-blur-md border border-purple-500/40 text-white px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs">Resume from <strong>{formatTime(resumePrompt)}</strong>?</span>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => applyResumeTime(resumePrompt)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-xl shadow"
                >
                  Resume
                </button>
                <button
                  onClick={() => setResumePrompt(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Center Play Overlay */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] cursor-pointer z-20"
            >
              <div className="w-16 h-16 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-2xl shadow-purple-950 hover:scale-110 transition-transform">
                <Play className="w-8 h-8 fill-white ml-1" />
              </div>
            </div>
          )}

          {/* Player Bottom Control Bar Overlay (Image 2 style) */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 flex flex-col gap-2">
            {/* Scrubber Range */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:h-2 transition-all"
            />

            <div className="flex items-center justify-between gap-4 text-white text-xs pt-1">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="hover:text-purple-400 transition">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                <button onClick={handleRewind} className="hover:text-purple-400 transition" title="Rewind 10s">
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button onClick={handleForward} className="hover:text-purple-400 transition" title="Forward 10s">
                  <RotateCw className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 group/vol">
                  <button onClick={toggleMute} className="hover:text-purple-400 transition">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-purple-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-slate-700 accent-purple-500 rounded cursor-pointer"
                  />
                </div>

                <span className="text-[11px] text-slate-300 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-3 relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className={`p-1.5 rounded-xl transition ${showSettingsMenu ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                  title="Playback Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {showSettingsMenu && (
                  <div className="absolute bottom-10 right-8 z-40 bg-[#0D0D12] border border-slate-800 rounded-2xl p-3 w-48 shadow-2xl text-xs space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                      Playback Speed
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handlePlaybackRateChange(rate)}
                          className={`py-1 text-center rounded-lg font-mono ${
                            playbackRate === rate ? 'bg-purple-600 text-white font-bold' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={toggleFullscreen} className="hover:text-purple-400 transition" title="Toggle Fullscreen">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
