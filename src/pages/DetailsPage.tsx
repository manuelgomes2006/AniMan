import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnimeDetails } from '../services/anilist/client';
import { getNormalizedEpisodes, NormalizedEpisode } from '../services/episodes/episodes';
import { setWatchlistCategory, getWatchlistItem } from '../services/userStore';
import { AnimeMedia } from '../types/anime';
import {
  Play, Plus, Check, Star, Video, Loader2, Search, ChevronDown
} from 'lucide-react';

export default function DetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [episodes, setEpisodes] = useState<NormalizedEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [rangeIndex, setRangeIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!id) return;
    async function loadDetails() {
      setLoading(true);
      try {
        const data = await getAnimeDetails(parseInt(id!, 10));
        setAnime(data);
        setInWatchlist(Boolean(getWatchlistItem(data.id)));

        const epList = await getNormalizedEpisodes(
          data.id,
          data.episodes,
          data.idMal,
          data.streamingEpisodes
        );
        setEpisodes(epList);
      } catch (err) {
        console.error('Failed to load anime details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [id]);

  const handleToggleWatchlist = () => {
    if (!anime) return;
    const updated = setWatchlistCategory(anime, 'watching');
    setInWatchlist(Boolean(updated));
  };

  const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.native || 'Anime';
  const banner = anime?.bannerImage || anime?.coverImage?.extraLarge;
  const cover = anime?.coverImage?.extraLarge || anime?.coverImage?.large;
  const synopsis = anime?.description?.replace(/<[^>]*>?/gm, '') || 'No description available.';
  const studioName = anime?.studios?.nodes?.[0]?.name || 'Unknown Studio';

  const totalCount = Math.max(episodes.length, anime?.episodes || 0, 12);
  const RANGE_SIZE = 100;

  const ranges = useMemo(() => {
    const r: { start: number; end: number; label: string }[] = [];
    for (let i = 0; i < totalCount; i += RANGE_SIZE) {
      const start = i + 1;
      const end = Math.min(i + RANGE_SIZE, totalCount);
      r.push({ start, end, label: `${start}-${end}` });
    }
    return r;
  }, [totalCount]);

  const currentRange = ranges[rangeIndex] || { start: 1, end: totalCount };

  const displayedEpisodes = useMemo(() => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      return episodes.filter(ep =>
        ep.number.toString() === q ||
        ep.title.toLowerCase().includes(q)
      );
    }
    return episodes.filter(ep => ep.number >= currentRange.start && ep.number <= currentRange.end);
  }, [episodes, searchQuery, currentRange]);

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

  return (
    <div className="space-y-6 sm:space-y-10 pb-16 font-sans text-white">
      {/* Top Banner Backdrop */}
      <div className="relative w-full h-[220px] sm:h-[420px] bg-[#050507] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
        <img
          src={banner}
          alt={title}
          className="w-full h-full object-cover filter brightness-75 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-48 relative z-20 space-y-6 sm:space-y-10">
        {/* Main Details Card */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-8 items-start">
          <div className="w-32 sm:w-64 shrink-0 mx-auto md:mx-0 shadow-2xl rounded-2xl overflow-hidden border-2 border-slate-800 bg-[#0D0D12]">
            <img src={cover} alt={title} className="w-full aspect-[3/4] object-cover" />
          </div>

          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
              <span className="bg-purple-600/90 text-white text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-md uppercase">
                {anime.format || 'TV'}
              </span>
              <span className="bg-[#0D0D12] text-amber-400 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-amber-500/20">
                <Star className="w-3 h-3 fill-amber-400" />
                {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.5'}
              </span>
              <span className="bg-[#0D0D12] text-slate-300 text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-md border border-slate-800">
                {studioName}
              </span>
            </div>

            <h1 className="text-xl sm:text-5xl font-black text-white leading-tight">
              {title}
            </h1>

            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 pt-1">
              {anime.genres?.map((genre) => (
                <span
                  key={genre}
                  className="bg-[#0D0D12] text-slate-300 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-md border border-slate-800 font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-3xl pt-1 opacity-90 line-clamp-4">
              {synopsis}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
              <Link
                to={`/watch/${anime.id}/1`}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl sm:rounded-2xl shadow-xl shadow-purple-950/60"
              >
                <Play className="w-4 h-4 fill-white" />
                Watch Episode 1
              </Link>

              <button
                onClick={handleToggleWatchlist}
                className="flex items-center gap-2 font-semibold text-xs sm:text-sm px-5 py-3 rounded-xl sm:rounded-2xl bg-[#0D0D12] border border-slate-800 text-slate-300 hover:text-white"
              >
                {inWatchlist ? <Check className="w-4 h-4 text-purple-400" /> : <Plus className="w-4 h-4 text-slate-300" />}
                {inWatchlist ? 'In Watchlist' : 'Add to List'}
              </button>
            </div>
          </div>
        </div>

        {/* Episode Catalog Section */}
        <section className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
            <h2 className="text-base sm:text-xl font-extrabold text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-400" />
              Episodes Catalog ({totalCount} Total)
            </h2>

            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search episode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#0D0D12] text-xs font-medium text-white placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Range Selector */}
              {searchQuery.trim() === '' && ranges.length > 1 && (
                <div className="relative">
                  <select
                    value={rangeIndex}
                    onChange={(e) => setRangeIndex(parseInt(e.target.value, 10))}
                    className="bg-[#0D0D12] text-purple-300 font-black py-1.5 pl-3 pr-8 rounded-xl border border-slate-800 appearance-none cursor-pointer focus:outline-none focus:border-purple-500 text-xs"
                  >
                    {ranges.map((r, idx) => (
                      <option key={r.label} value={idx}>
                        Episodes {r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* Episode Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {displayedEpisodes.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">
                No episodes found matching "{searchQuery}"
              </div>
            ) : (
              displayedEpisodes.map((ep) => {
                const thumbSrc = ep.thumbnail || cover;
                return (
                  <Link
                    key={ep.number}
                    to={`/watch/${anime.id}/${ep.number}`}
                    className="bg-[#0D0D12] hover:bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center gap-2.5 p-2 transition group"
                  >
                    <div className="relative w-20 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-950">
                      <img src={thumbSrc} alt={ep.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider block">EPISODE {ep.number}</span>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-white">
                        {ep.title}
                      </h4>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
