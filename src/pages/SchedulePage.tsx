import React, { useEffect, useState } from 'react';
import { getAiringSchedule, AiringScheduleItem } from '../services/anilist/client';
import AnimeCard from '../components/common/AnimeCard';
import { Calendar, Clock, Loader2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SchedulePage() {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIndex = new Date().getDay();

  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const [scheduleItems, setScheduleItems] = useState<AiringScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const now = Math.floor(Date.now() / 1000);
        const startOfWeek = now - 7 * 86400;
        const endOfWeek = now + 7 * 86400;

        const data = await getAiringSchedule(startOfWeek, endOfWeek);
        setScheduleItems(data);
      } catch (err) {
        console.error('Schedule load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, []);

  // Filter airing items by selected day of the week
  const daySchedule = scheduleItems.filter(item => {
    const itemDay = new Date(item.airingAt * 1000).getDay();
    return itemDay === selectedDayIndex;
  });

  const formatAirTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="border-b border-slate-900 pb-4">
        <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
          <Calendar className="w-5 h-5 text-purple-400" />
          Airing Release Schedule
        </h1>
        <p className="text-xs text-slate-400">Weekly broadcast times for currently releasing anime series.</p>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {daysOfWeek.map((dayName, idx) => {
          const isToday = idx === todayIndex;
          const isSelected = idx === selectedDayIndex;
          return (
            <button
              key={dayName}
              onClick={() => setSelectedDayIndex(idx)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition flex flex-col items-center gap-0.5 ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40'
                  : 'bg-[#0D0D12] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{dayName}</span>
              {isToday && (
                <span className="text-[9px] uppercase tracking-wider text-purple-300 font-black">
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day Schedule Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : daySchedule.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {daySchedule.map((item) => {
            const title = item.media.title?.english || item.media.title?.romaji || 'Anime';
            const cover = item.media.coverImage?.large || item.media.coverImage?.extraLarge;
            return (
              <div
                key={item.id}
                className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-3 flex items-center gap-3.5 group hover:border-purple-500/50 transition"
              >
                <Link to={`/anime/${item.media.id}`} className="relative w-16 aspect-[3/4] rounded-xl overflow-hidden bg-slate-950 shrink-0">
                  <img src={cover} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <div className="absolute top-1 left-1 bg-purple-600 text-white text-[8px] font-black px-1 rounded">
                    EP {item.episode}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/anime/${item.media.id}`} className="font-extrabold text-xs text-white line-clamp-1 group-hover:text-purple-400 transition">
                    {title}
                  </Link>
                  <span className="text-[10px] text-purple-400 font-semibold block mt-0.5">
                    Episode {item.episode}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Airs at {formatAirTime(item.airingAt)}</span>
                  </div>
                </div>

                <Link
                  to={`/watch/${item.media.id}/${item.episode}`}
                  className="w-8 h-8 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg hover:scale-110 transition shrink-0"
                  title="Watch Episode"
                >
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#0D0D12] rounded-3xl border border-slate-900">
          <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-2" />
          <p className="text-slate-400 text-sm font-medium">No anime releases scheduled for {daysOfWeek[selectedDayIndex]}.</p>
        </div>
      )}
    </div>
  );
}
