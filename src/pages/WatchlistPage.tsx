import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWatchlist, fetchWatchHistoryFromSupabase, clearWatchHistory } from '../services/userStore';
import { WatchProgress, WatchlistCategory } from '../types/user';
import AnimeCard from '../components/common/AnimeCard';
import { Bookmark, Clock, Trash2, Heart, Play } from 'lucide-react';
import { AnimeMedia } from '../types/anime';

export interface ExtendedWatchlistItem {
  animeId: number;
  title: string;
  coverImage: string;
  category: WatchlistCategory;
  addedAt: string;
  averageScore?: number;
  format?: string;
  episodes?: number;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<ExtendedWatchlistItem[]>([]);
  const [history, setHistory] = useState<WatchProgress[]>([]);
  const [activeTab, setActiveTab] = useState<WatchlistCategory | 'history'>('watching');

  useEffect(() => {
    async function loadData() {
      const rawList = getWatchlist();
      const mappedList: ExtendedWatchlistItem[] = rawList.map(item => ({
        animeId: item.anime?.id || (item as any).animeId || 151807,
        title: item.anime?.title?.english || item.anime?.title?.romaji || (item as any).title || 'Anime',
        coverImage: item.anime?.coverImage?.large || item.anime?.coverImage?.extraLarge || (item as any).coverImage || '',
        category: item.category,
        addedAt: item.addedAt || new Date().toISOString(),
        averageScore: item.anime?.averageScore,
        format: item.anime?.format,
        episodes: item.anime?.episodes
      }));

      setWatchlist(mappedList);
      const historyData = await fetchWatchHistoryFromSupabase();
      setHistory(historyData);
    }
    loadData();
  }, []);

  const handleClearHistory = async () => {
    await clearWatchHistory();
    setHistory([]);
  };

  const filteredWatchlist = watchlist.filter(item => item.category === activeTab);

  const categories: { id: WatchlistCategory; label: string }[] = [
    { id: 'watching', label: 'Watching' },
    { id: 'completed', label: 'Completed' },
    { id: 'plan_to_watch', label: 'Plan to Watch' },
    { id: 'on_hold', label: 'On Hold' },
    { id: 'dropped', label: 'Dropped' }
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
            <Bookmark className="w-6 h-6 text-purple-400" />
            My Watchlist & Library
          </h1>
          <p className="text-xs text-slate-400">Manage your saved anime categories and playback history.</p>
        </div>

        {/* Category Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#0D0D12] p-1.5 rounded-2xl border border-slate-800 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeTab === cat.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.label} ({watchlist.filter(i => i.category === cat.id).length})
            </button>
          ))}
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            History ({history.length})
          </button>
        </div>
      </div>

      {/* Watchlist Category Grid */}
      {activeTab !== 'history' && (
        <div>
          {filteredWatchlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {filteredWatchlist.map((item) => {
                const anime: AnimeMedia = {
                  id: item.animeId,
                  title: { english: item.title, romaji: item.title },
                  coverImage: { extraLarge: item.coverImage, large: item.coverImage, medium: item.coverImage },
                  averageScore: item.averageScore || 85,
                  format: item.format || 'TV',
                  episodes: item.episodes || 12
                };
                return <AnimeCard key={item.animeId} anime={anime} />;
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#0D0D12] rounded-3xl border border-slate-900">
              <Heart className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="text-white font-bold text-base mb-1">No Anime in this Category</h3>
              <p className="text-xs text-slate-400 mb-4">Click "Add to List" on any anime card to organize your library.</p>
              <Link to="/browse" className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-6 py-3 rounded-2xl inline-block shadow-lg">
                Browse Anime Catalog
              </Link>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleClearHistory}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Clear History
              </button>
            </div>
          )}

          {history.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => {
                const percentage = item.duration > 0
                  ? Math.min(100, Math.round((item.currentTime / item.duration) * 100))
                  : 45;

                return (
                  <div
                    key={`${item.animeId}-${item.episodeNumber}`}
                    className="bg-[#0D0D12] border border-slate-900 rounded-2xl p-3.5 flex items-center gap-3 group hover:border-purple-500/50 transition"
                  >
                    <img
                      src={item.coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80'}
                      alt={item.title}
                      className="w-16 h-20 object-cover rounded-xl shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-purple-400 uppercase block">EPISODE {item.episodeNumber}</span>
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-purple-400">{item.title}</h4>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${percentage}%` }} />
                      </div>
                      <Link
                        to={`/watch/${item.animeId}/${item.episodeNumber}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-purple-400 font-semibold mt-2"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Resume ({percentage}%)
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#0D0D12] rounded-3xl border border-slate-900">
              <Clock className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="text-white font-bold text-base mb-1">No Watch History Found</h3>
              <p className="text-xs text-slate-400">Episodes you watch will automatically save your position here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
