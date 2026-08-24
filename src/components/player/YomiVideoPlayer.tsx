import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Settings } from 'lucide-react';
import { StreamingSource } from '../../services/streaming/providerTypes';

interface AniworldVideoPlayerProps {
  source: StreamingSource | null;
  title: string;
  episodeNumber: number;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  skipIntroEnabled?: boolean;
  skipOutroEnabled?: boolean;
  onSwitchMirror?: () => void;
}

export default function YomiVideoPlayer({
  source,
  title,
  episodeNumber,
  onEnded,
  onTimeUpdate,
  initialTime = 0,
  skipIntroEnabled = false,
  onSwitchMirror
}: AniworldVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualities, setQualities] = useState<string[]>(['Auto', '1080p', '720p', '480p']);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isHlsSource, setIsHlsSource] = useState(false);

  const controlsTimeoutRef = useRef<any>(null);

  // Initialize HLS.js or Embed player
  useEffect(() => {
    if (!source || !source.url) return;

    const url = source.url;
    const isDirectHls = url.includes('.m3u8') || source.type === 'hls';
    setIsHlsSource(isDirectHls);

    if (isDirectHls && videoRef.current) {
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hls.loadSource(url);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          if (data.levels && data.levels.length > 0) {
            const parsedQualities = ['Auto', ...data.levels.map((l) => `${l.height}p`)];
            setQualities(parsedQualities);
          }
          if (initialTime > 5 && videoRef.current) {
            videoRef.current.currentTime = initialTime;
          }
          videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
        });

        hlsRef.current = hls;
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = url;
        if (initialTime > 5) videoRef.current.currentTime = initialTime;
        videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [source, initialTime]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);
    if (onTimeUpdate) onTimeUpdate(cur, dur);

    // Auto Skip Intro (between 10s and 95s)
    if (skipIntroEnabled && cur > 10 && cur < 90) {
      videoRef.current.currentTime = 95;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('aniworld-player-container');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!source || !source.url) {
    return (
      <div className="w-full aspect-video bg-[#0D0D12] border border-slate-900 rounded-3xl flex items-center justify-center">
        <span className="text-xs text-purple-400 font-extrabold animate-pulse">Loading AniWorld stream feed...</span>
      </div>
    );
  }

  return (
    <div
      id="aniworld-player-container"
      onMouseMove={handleMouseMove}
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-900/90 group select-none"
    >
      {/* 1. HLS Video Element or iFrame Embed Fallback */}
      {isHlsSource ? (
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onEnded}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          playsInline
        />
      ) : (
        <iframe
          key={`${source.url}`}
          src={source.url}
          title={`${title} - Episode ${episodeNumber}`}
          className="w-full h-full border-0 relative z-10 pointer-events-auto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="origin"
        />
      )}

      {/* 2. Top Header Overlay (Always visible on hover for both HLS & Embed sources) */}
      <div
        className={`absolute top-0 left-0 right-0 p-3.5 z-30 flex items-center justify-between transition-opacity duration-300 pointer-events-auto ${
          showControls ? 'opacity-100 bg-gradient-to-b from-black/80 to-transparent' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="bg-purple-600 text-white text-[10px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider shadow-md">
            ANIWORLD HD
          </span>
          <span className="text-xs font-black text-white truncate max-w-[180px] sm:max-w-xs">{title} • Ep {episodeNumber}</span>
        </div>

        {onSwitchMirror && (
          <button
            onClick={onSwitchMirror}
            className="bg-slate-900/90 hover:bg-purple-900 border border-slate-700/80 text-purple-300 hover:text-white font-extrabold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
            <span>Switch Mirror</span>
          </button>
        )}
      </div>

      {/* 3. Bottom Bar Custom Controls (for HLS Direct Sources) */}
      {isHlsSource && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 z-30 transition-opacity duration-300 bg-gradient-to-t from-black/90 to-transparent ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="space-y-2">
            {/* Seek Bar */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-white">
                <button onClick={togglePlay} className="hover:text-purple-400 transition cursor-pointer">
                  {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="hover:text-purple-400 transition cursor-pointer">
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 accent-purple-500 h-1 bg-slate-800 rounded-lg cursor-pointer hidden sm:block"
                  />
                </div>

                <span className="text-xs font-mono font-bold text-slate-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="hover:text-purple-400 text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{selectedQuality}</span>
                  </button>

                  {showSettings && (
                    <div className="absolute right-0 bottom-8 bg-[#0D0D12] border border-slate-800 rounded-2xl p-2 w-32 shadow-2xl space-y-1 z-40">
                      {qualities.map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            setSelectedQuality(q);
                            setShowSettings(false);
                          }}
                          className={`w-full text-left text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                            selectedQuality === q ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={toggleFullscreen} className="hover:text-purple-400 text-white cursor-pointer">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
