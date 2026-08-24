import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAnimeDetails } from '../services/anilist/client';
import { activeStreamingProvider } from '../services/streaming/anilink';
import VideoPlayer from '../components/player/VideoPlayer';
import SubDubControls from '../components/player/SubDubControls';
import { AnimeMedia } from '../types/anime';
import { StreamingResult, AudioVariant, ServerOption } from '../types/stream';
import {
  Star, Plus, Heart, MessageSquare, AlertTriangle, ThumbsUp, ThumbsDown,
  Loader2, Play, ChevronDown, Check, Server, ArrowLeft, Download, Share2,
  MoreVertical, Cast, Activity, Pause
} from 'lucide-react';
import { getPreferredAudio, setPreferredAudio, getWatchProgress, setWatchlistCategory, getWatchlistItem } from '../services/userStore';

export default function WatchPage() {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const navigate = useNavigate();
  const epNum = parseInt(episode || '1', 10);

  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [streamData, setStreamData] = useState<StreamingResult | null>(null);
  const [audioVariant, setAudioVariant] = useState<AudioVariant>(getPreferredAudio());
  const [selectedServer, setSelectedServer] = useState<ServerOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(true);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState([
    {
      id: 'c1',
      author: 'ShadowMonarch',
      tag: 'Top Fan',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      time: '2h ago',
      content: 'This episode was insane! The animation is next level 🔥',
      likes: 245
    },
    {
      id: 'c2',
      author: 'AnimeKing99',
      tag: 'Pro Member',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      time: '4h ago',
      content: 'The sound design during the boss fight gave me chills. 10/10 episode!',
      likes: 89
    }
  ]);

  useEffect(() => {
    if (!id) return;
    async function loadMeta() {
      setLoading(true);
      try {
        const data = await getAnimeDetails(parseInt(id!, 10));
        setAnime(data);
      } catch (err) {
        console.error('Failed to load anime details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, [id]);

  useEffect(() => {
    if (!anime) return;
    async function fetchStreams() {
      setStreamLoading(true);
      try {
        const title = anime.title?.english || anime.title?.romaji || 'Anime';
        const res = await activeStreamingProvider.getSources(
          anime.id,
          title,
          epNum,
          audioVariant,
          anime.idMal
        );
        setStreamData(res);
        if (res.servers.length > 0) {
          setSelectedServer(res.servers[0]);
        }
      } catch (err) {
        console.error('Stream resolution error:', err);
      } finally {
        setStreamLoading(false);
      }
    }
    fetchStreams();
  }, [anime, epNum, audioVariant]);

  const handleAudioChange = (variant: AudioVariant) => {
    setAudioVariant(variant);
    setPreferredAudio(variant);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setComments([
      {
        id: `c_${Date.now()}`,
        author: 'JinWoo',
        tag: 'You',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        time: 'Just now',
        content: commentInput.trim(),
        likes: 0
      },
      ...comments
    ]);
    setCommentInput('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[75vh]">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-white mb-2">Anime Not Found</h2>
        <Link to="/" className="text-purple-400 hover:underline text-sm font-semibold">Return Home</Link>
      </div>
    );
  }

  const title = anime.title?.english || anime.title?.romaji || 'Anime';
  const totalEpisodes = anime.streamingEpisodes?.length || anime.episodes || 12;
  const currentEpData = anime.streamingEpisodes?.[epNum - 1];
  const episodeTitle = currentEpData?.title || `Episode ${epNum}`;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '9.3';
  const inWatchlist = Boolean(getWatchlistItem(anime.id));
  const savedProgress = getWatchProgress(anime.id, epNum);

  const handleNextEpisode = () => {
    if (epNum < totalEpisodes) {
      navigate(`/watch/${anime.id}/${epNum + 1}`);
    }
  };

  const handlePrevEpisode = () => {
    if (epNum > 1) {
      navigate(`/watch/${anime.id}/${epNum - 1}`);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Mobile Top Navigation Header (Matching Mockup 2 format) */}
      <div className="flex lg:hidden items-center justify-between px-1 py-2 text-white">
        <button onClick={() => navigate(-1)} className="p-1 text-slate-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center text-center truncate px-2">
          <span className="font-bold text-sm truncate">{title}</span>
          <span className="text-[10px] text-slate-400 font-medium">S1 • Ep {epNum}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-300">
          <button className="hover:text-white"><Cast className="w-4 h-4" /></button>
          <button className="hover:text-white"><Download className="w-4 h-4" /></button>
          <button className="hover:text-white"><MoreVertical className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Section (Player, Info, Audio, Servers, Episodes on Mobile) */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          {/* Main Video Player */}
          {streamLoading ? (
            <div className="w-full aspect-video bg-[#0D0D12] rounded-3xl border border-slate-800 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              <span className="text-xs text-slate-400 font-semibold">Resolving stream sources...</span>
            </div>
          ) : (
            <VideoPlayer
              embedUrl={selectedServer?.url || streamData?.embedUrl}
              fallbackHls={streamData?.sources?.[0]?.url}
              servers={streamData?.servers || []}
              animeMeta={anime}
              episodeNumber={epNum}
              onEpisodeEnd={handleNextEpisode}
            />
          )}

          {/* Episode Info & Quick Actions Header (Matching Mockup 2 layout) */}
          <div className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-3xl font-black text-white">{title}</h1>
                <div className="text-xs text-purple-400 font-bold flex items-center gap-1.5 mt-0.5">
                  <span>S1 • Episode {epNum}</span>
                </div>
                <h3 className="text-xs font-semibold text-purple-300 hover:underline cursor-pointer mt-0.5">
                  {episodeTitle}
                </h3>
              </div>

              <button
                onClick={handleNextEpisode}
                disabled={epNum >= totalEpisodes}
                className="hidden sm:flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl shadow shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Next Episode
              </button>
            </div>

            {/* Quick Action Bar (Matching Mockup 2: + Watchlist, Like, Share) */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-4 text-slate-300">
                <button
                  onClick={() => setWatchlistCategory(anime, 'watching')}
                  className="flex items-center gap-1.5 hover:text-purple-400 font-semibold"
                >
                  {inWatchlist ? <Check className="w-4 h-4 text-purple-400" /> : <Plus className="w-4 h-4" />}
                  <span>Watchlist</span>
                </button>

                <button className="flex items-center gap-1.5 hover:text-purple-400 font-semibold">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Like</span>
                </button>

                <button className="flex items-center gap-1.5 hover:text-purple-400 font-semibold">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>

              <button
                onClick={handleNextEpisode}
                disabled={epNum >= totalEpisodes}
                className="flex sm:hidden items-center gap-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow shrink-0"
              >
                <Play className="w-3 h-3 fill-white" />
                Next Episode
              </button>
            </div>
          </div>

          {/* AUDIO SUB / DUB Controls (Matching Mockup 2) */}
          <SubDubControls
            currentVariant={audioVariant}
            isDubAvailable={streamData?.isDubAvailable ?? true}
            onChangeVariant={handleAudioChange}
          />

          {/* SERVER Selector Options (Matching Mockup 2: horizontally scrollable pills) */}
          {streamData?.servers && streamData.servers.length > 0 && (
            <div className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider block">SERVER</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {streamData.servers.map((srv) => {
                  const isSel = selectedServer?.id === srv.id;
                  return (
                    <button
                      key={srv.id}
                      onClick={() => setSelectedServer(srv)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        isSel
                          ? 'bg-purple-600/20 text-purple-300 border-2 border-purple-500 shadow-lg ring-1 ring-purple-500/40'
                          : 'bg-[#050507] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {srv.name}
                        {isSel && <Activity className="w-3 h-3 text-purple-400 animate-pulse" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MOBILE EPISODES SECTION — Placed Below Player on Mobile (< 1024px) matching Mockup 2 */}
          <div className="block lg:hidden bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">EPISODES</span>
              <button className="flex items-center gap-1 text-xs font-bold text-slate-300 bg-[#050507] px-2.5 py-1 rounded-lg border border-slate-800">
                <span>Season 1</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Stacked Episode Cards (Matching Mockup 2 format) */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {[...Array(totalEpisodes)].map((_, i) => {
                const ep = i + 1;
                const isActive = ep === epNum;
                const epData = anime.streamingEpisodes?.[i];
                const epTitle = epData?.title || `Episode ${ep}`;
                const epThumb = epData?.thumbnail || anime.coverImage?.large;

                return (
                  <Link
                    key={ep}
                    to={`/watch/${anime.id}/${ep}`}
                    className={`flex items-center gap-3 p-2 rounded-xl border transition group ${
                      isActive
                        ? 'bg-purple-600/20 border-2 border-purple-500 text-white shadow-lg shadow-purple-950/60 ring-1 ring-purple-500/40'
                        : 'bg-[#050507]/90 border-slate-900 text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-slate-950 shrink-0">
                      <img src={epThumb} alt={epTitle} className="w-full h-full object-cover" />
                      {isActive && (
                        <div className="absolute inset-0 bg-purple-950/70 flex items-center justify-center">
                          <Pause className="w-4 h-4 fill-white text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                        Episode {ep}
                      </span>
                      <h4 className="text-xs font-bold line-clamp-1 group-hover:text-purple-300">
                        {epTitle}
                      </h4>
                      <span className="text-[10px] text-slate-500 block mt-0.5">24m</span>
                      {isActive && savedProgress && (
                        <div className="w-full bg-slate-900 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full" style={{ width: `${savedProgress.percentage}%` }} />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Comments & Reviews Section */}
          <div className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-6">
            <div className="flex items-center gap-6 border-b border-slate-900 pb-3 text-xs sm:text-sm font-bold">
              <span className="text-purple-400 border-b-2 border-purple-500 pb-3 -mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments (1.2K)
              </span>
              <span className="text-slate-500 hover:text-slate-300 cursor-pointer">
                Reviews (340)
              </span>
            </div>

            <form onSubmit={handlePostComment} className="flex gap-3">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Avatar"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 border border-purple-500/30"
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="w-full bg-[#050507] border border-slate-800 rounded-2xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-lg shadow-purple-950 shrink-0"
                >
                  Post
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {comments.map((item) => (
                <div key={item.id} className="flex gap-3 text-xs bg-[#050507]/60 p-3 rounded-2xl border border-slate-900">
                  <img src={item.avatar} alt={item.author} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.author}</span>
                      <span className="bg-purple-950 text-purple-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-purple-800/40">
                        {item.tag}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-auto">{item.time}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{item.content}</p>
                    <div className="flex items-center gap-4 text-slate-500 pt-1">
                      <button className="flex items-center gap-1 hover:text-purple-400">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{item.likes}</span>
                      </button>
                      <button className="hover:text-rose-400">
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DESKTOP RIGHT SIDEBAR (Hidden on Mobile <1024px, 100% Intact on Desktop ≥1024px) */}
        <div className="hidden lg:block space-y-4">
          <div className="bg-[#0D0D12] border border-slate-800/80 rounded-3xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 text-xs font-bold">
              <span className="text-purple-400 border-b-2 border-purple-500 pb-3 -mb-3">
                Episodes
              </span>
              <span className="text-slate-500 hover:text-slate-300 cursor-pointer">
                Related
              </span>
            </div>

            <div className="flex items-center justify-between text-xs bg-[#050507] p-2.5 rounded-xl border border-slate-800">
              <span className="font-bold text-white flex items-center gap-1">
                Season 1 <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">{totalEpisodes} Episodes</span>
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {[...Array(totalEpisodes)].map((_, i) => {
                const ep = i + 1;
                const isActive = ep === epNum;
                const epData = anime.streamingEpisodes?.[i];
                const epTitle = epData?.title || `Episode ${ep}`;
                const epThumb = epData?.thumbnail || anime.coverImage?.large;

                return (
                  <Link
                    key={ep}
                    to={`/watch/${anime.id}/${ep}`}
                    className={`flex items-center gap-3 p-2 rounded-2xl border transition group ${
                      isActive
                        ? 'bg-purple-600/10 border-purple-500/80 text-white shadow-lg ring-1 ring-purple-500/50'
                        : 'bg-[#050507]/80 border-slate-900 text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="relative w-20 aspect-video rounded-xl overflow-hidden bg-slate-950 shrink-0">
                      <img src={epThumb} alt={epTitle} className="w-full h-full object-cover" />
                      {isActive && (
                        <div className="absolute inset-0 bg-purple-950/60 flex items-center justify-center">
                          <Play className="w-4 h-4 fill-white text-white animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                        {ep}
                      </span>
                      <h4 className="text-xs font-bold line-clamp-1 group-hover:text-purple-300">
                        {epTitle}
                      </h4>
                      <span className="text-[10px] text-slate-500 block mt-0.5">24m</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="bg-[#0D0D12] border border-slate-800/80 rounded-3xl p-4 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              You're Watching
            </span>
            <div className="flex items-center gap-3">
              <img
                src={anime.coverImage?.medium}
                alt={title}
                className="w-12 h-16 object-cover rounded-xl shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-extrabold text-white truncate">{title}</h4>
                <span className="text-[10px] text-purple-400 font-bold block">S1 • Ep {epNum}</span>
                <div className="w-full bg-slate-900 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${savedProgress?.percentage || 60}%` }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleNextEpisode}
              className="w-full text-center text-xs font-bold text-purple-400 hover:text-purple-300 pt-1 block"
            >
              Continue Watching ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
