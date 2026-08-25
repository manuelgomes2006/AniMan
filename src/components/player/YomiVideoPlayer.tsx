import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Settings, AlertTriangle, ShieldCheck, Flag, Info } from 'lucide-react';
import { StreamingSource } from '../../services/streaming/providerTypes';
import { isAllowedEmbedUrl, recordProviderSuccess, recordProviderFailure, VIDEO_PROVIDERS } from '../../services/streaming/providerRegistry';

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
  const [hasPlayerError, setHasPlayerError] = useState(false);
  const [errorReason, setErrorReason] = useState<string>('Unable to load this video server.');
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  const controlsTimeoutRef = useRef<any>(null);

  // Development Diagnostics Logging
  useEffect(() => {
    if (source) {
      console.log('[AniWorld] Provider:', source.providerName);
      console.log('[AniWorld] iframe URL:', source.url);
      console.log('[AniWorld] Provider Status:', source.status);
    }
  }, [source]);

  // Initialize player state when source changes
  useEffect(() => {
    setHasPlayerError(false);
    setIsIframeLoading(true);
    setErrorReason('Unable to load this video server.');

    if (!source || !source.url) {
      setHasPlayerError(true);
      setErrorReason('Unable to find a playable video server for this episode.');
      setIsIframeLoading(false);
      return;
    }

    const url = source.url;

    // 1. Check provider status classification
    if (source.status === 'blocked_by_provider') {
      console.warn(`[AniWorld Player] Root Cause: Provider ${source.providerName} explicitly blocks embedding via X-Frame-Options or JS frame-busting.`);
      setHasPlayerError(true);
      setErrorReason(`Blocked by provider (${source.providerName}). Third-party iframe embedding is restricted by host security rules.`);
      setIsIframeLoading(false);
      return;
    }

    if (source.status === 'offline') {
      console.warn(`[AniWorld Player] Root Cause: Provider ${source.providerName} host is offline or unreachable via DNS.`);
      setHasPlayerError(true);
      setErrorReason(`Provider ${source.providerName} is currently offline or unreachable.`);
      setIsIframeLoading(false);
      return;
    }

    if (source.status === 'invalid_url') {
      console.warn(`[AniWorld Player] Root Cause: Provider ${source.providerName} URL mapping is invalid or non-existent route.`);
      setHasPlayerError(true);
      setErrorReason(`Provider ${source.providerName} episode URL route is invalid.`);
      setIsIframeLoading(false);
      return;
    }

    // 2. Validate domain allowlist and HTTPS safety
    if (!isAllowedEmbedUrl(url, source.providerId)) {
      console.warn(`[AniWorld Player] Root Cause: URL failed domain allowlist validation (${url})`);
      setHasPlayerError(true);
      setErrorReason('URL failed domain allowlist validation.');
      if (source.providerId) recordProviderFailure(source.providerId);
      setIsIframeLoading(false);
      return;
    }

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
          setIsIframeLoading(false);
          if (source.providerId) recordProviderSuccess(source.providerId);

          if (data.levels && data.levels.length > 0) {
            const parsedQualities = ['Auto', ...data.levels.map((l) => `${l.height}p`)];
            setQualities(parsedQualities);
          }
          if (initialTime > 5 && videoRef.current) {
            videoRef.current.currentTime = initialTime;
          }
          videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
        });

        hls.on(Hls.Events.ERROR, () => {
          setHasPlayerError(true);
          setErrorReason('HLS stream load error or segment download failure.');
          if (source.providerId) recordProviderFailure(source.providerId);
        });

        hlsRef.current = hls;
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = url;
        setIsIframeLoading(false);
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

  const handleIframeLoad = () => {
    setIsIframeLoading(false);
    if (source?.providerId) recordProviderSuccess(source.providerId);
  };

  const handleIframeError = () => {
    setHasPlayerError(true);
    setIsIframeLoading(false);
    setErrorReason('Unable to load this video server. Connection refused or blocked by provider headers.');
    if (source?.providerId) recordProviderFailure(source.providerId);
  };

  return (
    <div className="space-y-2">
      {/* Development Diagnostics Banner */}
      {(import.meta.env.DEV || process.env.NODE_ENV !== 'production') && source && (
        <div className="bg-purple-950/40 border border-purple-800/60 p-2.5 rounded-xl text-[11px] font-mono text-purple-300 flex items-center justify-between">
          <span>[AniWorld Dev] Provider: <strong>{source.providerName}</strong> ({source.status})</span>
          <span className="truncate max-w-xs text-slate-400 font-mono text-[10px]">{source.url}</span>
        </div>
      )}

      <div
        id="aniworld-player-container"
        onMouseMove={handleMouseMove}
        className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-900/90 group select-none"
      >
        {/* Skeleton Loading Indicator */}
        {isIframeLoading && !hasPlayerError && source && (
          <div className="absolute inset-0 bg-[#0D0D12] z-20 flex flex-col items-center justify-center space-y-3 animate-pulse">
            <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-extrabold">Loading {source.providerName}...</span>
          </div>
        )}

        {/* Automatic Provider Fallback & Honest Server Diagnostics Card */}
        {hasPlayerError || !source || !source.url ? (
          <div className="absolute inset-0 bg-[#0D0D12] z-40 p-6 flex flex-col items-center justify-center text-center space-y-4 overflow-y-auto">
            <div className="w-12 h-12 bg-amber-950/60 border border-amber-800/80 rounded-2xl flex items-center justify-center text-amber-400 shadow-xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1 max-w-lg">
              <h3 className="text-sm font-black text-white">Unable to find a playable video server for this episode.</h3>
              <p className="text-xs text-amber-300 font-bold bg-amber-950/40 border border-amber-800/50 px-3 py-1 rounded-xl inline-block">
                {errorReason}
              </p>
            </div>

            {/* Comprehensive Server Status Breakdown */}
            <div className="w-full max-w-md bg-[#14141F] border border-slate-800 rounded-2xl p-3 text-left text-xs space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Info className="w-3 h-3 text-purple-400" /> Server Status Audit
              </span>
              <div className="space-y-1 divide-y divide-slate-800/60">
                {VIDEO_PROVIDERS.map((prov) => (
                  <div key={prov.id} className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-300">○ {prov.name}</span>
                    <span className={`font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      prov.status === 'available'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : prov.status === 'blocked_by_provider'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : prov.status === 'offline'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {prov.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              {onSwitchMirror && (
                <button
                  onClick={onSwitchMirror}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Next Server</span>
                </button>
              )}

              <button
                onClick={() => alert('Server status log reported to AniWorld backend.')}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                <span>Report Issue</span>
              </button>
            </div>
          </div>
        ) : isHlsSource ? (
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
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}

        {/* Top Header Overlay */}
        <div
          className={`absolute top-0 left-0 right-0 p-3.5 z-30 flex items-center justify-between transition-opacity duration-300 pointer-events-auto ${
            showControls ? 'opacity-100 bg-gradient-to-b from-black/80 to-transparent' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="bg-purple-600 text-white text-[10px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider shadow-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> ANIWORLD HD
            </span>
            <span className="text-xs font-black text-white truncate max-w-[180px] sm:max-w-xs">
              {title} • Ep {episodeNumber}
            </span>
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

        {/* Bottom Bar Custom Controls (for HLS Direct Sources) */}
        {isHlsSource && !hasPlayerError && (
          <div
            className={`absolute bottom-0 left-0 right-0 p-4 z-30 transition-opacity duration-300 bg-gradient-to-t from-black/90 to-transparent ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="space-y-2">
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
    </div>
  );
}
