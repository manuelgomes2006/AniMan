import React, { useEffect, useState } from 'react';
import { getAiringSchedule, AiringScheduleItem } from '../services/anilist/client';
import { Calendar, Clock, Loader2, Play, CheckCircle, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DayOption {
  dayName: string;
  dateStr: string;
  dayIndex: number;
  dateTimestamp: number; // Start of day timestamp
  isToday: boolean;
  isTomorrow: boolean;
  isDayAfterTomorrow: boolean;
  isYesterday: boolean;
}

export default function SchedulePage() {
  const [scheduleItems, setScheduleItems] = useState<AiringScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'daily' (single selected day) vs 'upcoming' (combined Tomorrow & Day After)
  const [viewMode, setViewMode] = useState<'daily' | 'upcoming'>('daily');

  // Generate 7-day relative sliding window (-3 days past up to +3 days future)
  const [weekDays, setWeekDays] = useState<DayOption[]>([]);
  const [selectedDayTimestamp, setSelectedDayTimestamp] = useState<number>(0);

  useEffect(() => {
    const today = new Date();
    const days: DayOption[] = [];

    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      d.setHours(0, 0, 0, 0);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const startOfDayTimestamp = Math.floor(d.getTime() / 1000);

      days.push({
        dayName,
        dateStr,
        dayIndex: d.getDay(),
        dateTimestamp: startOfDayTimestamp,
        isToday: i === 0,
        isTomorrow: i === 1,
        isDayAfterTomorrow: i === 2,
        isYesterday: i === -1
      });
    }

    setWeekDays(days);
    const todayObj = days.find(d => d.isToday) || days[3];
    setSelectedDayTimestamp(todayObj.dateTimestamp);
  }, []);

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const now = Math.floor(Date.now() / 1000);
        // Fetch 4 days past and 4 days future to cover all local timezone offsets completely
        const startOfWeek = now - 4 * 86400;
        const endOfWeek = now + 4 * 86400;

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

  const nowTimestamp = Math.floor(Date.now() / 1000);

  // Helper: Exact Local Calendar Day Matcher (handles all timezones accurately)
  const isSameCalendarDay = (timestampA: number, timestampB: number) => {
    const dateA = new Date(timestampA * 1000);
    const dateB = new Date(timestampB * 1000);
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  };

  // Get tomorrow & day after tomorrow objects
  const tomorrowObj = weekDays.find(d => d.isTomorrow);
  const dayAfterTomorrowObj = weekDays.find(d => d.isDayAfterTomorrow);

  // Tomorrow schedule items
  const tomorrowItems = tomorrowObj
    ? scheduleItems.filter(item => isSameCalendarDay(item.airingAt, tomorrowObj.dateTimestamp))
    : [];

  // Day after tomorrow schedule items
  const dayAfterTomorrowItems = dayAfterTomorrowObj
    ? scheduleItems.filter(item => isSameCalendarDay(item.airingAt, dayAfterTomorrowObj.dateTimestamp))
    : [];

  // Filter airing items by currently selected day
  const daySchedule = scheduleItems.filter(item => isSameCalendarDay(item.airingAt, selectedDayTimestamp));

  const selectedDayObj = weekDays.find(d => d.dateTimestamp === selectedDayTimestamp) || weekDays[0];

  const formatAirTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderScheduleCard = (item: AiringScheduleItem) => {
    const title = item.media.title?.english || item.media.title?.romaji || 'Anime';
    const cover = item.media.coverImage?.large || item.media.coverImage?.extraLarge;
    const hasAired = item.airingAt <= nowTimestamp;
    const isAiringSoon = !hasAired && item.airingAt <= nowTimestamp + 86400;

    return (
      <div
        key={item.id}
        className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-3.5 flex items-center gap-3.5 group hover:border-purple-500/50 transition shadow-md"
      >
        <Link to={`/anime/${item.media.id}`} className="relative w-16 aspect-[3/4] rounded-xl overflow-hidden bg-slate-950 shrink-0 shadow-md">
          <img src={cover} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition" />
          <div className="absolute top-1 left-1 bg-purple-600 text-white text-[8px] font-black px-1 rounded shadow">
            EP {item.episode}
          </div>
        </Link>

        <div className="flex-1 min-w-0 space-y-1">
          <Link to={`/anime/${item.media.id}`} className="font-extrabold text-xs text-white line-clamp-1 group-hover:text-purple-400 transition">
            {title}
          </Link>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-purple-400 font-bold">Episode {item.episode}</span>
            <span>•</span>
            {hasAired ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.5 rounded-md">
                <CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> Aired
              </span>
            ) : isAiringSoon ? (
              <span className="text-amber-300 font-bold flex items-center gap-1 bg-amber-950/40 border border-amber-800/60 px-1.5 py-0.5 rounded-md animate-pulse">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Airing Soon
              </span>
            ) : (
              <span className="text-indigo-300 font-bold bg-indigo-950/40 border border-indigo-800/60 px-1.5 py-0.5 rounded-md">
                Upcoming
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-0.5">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Airs at <strong className="text-slate-200">{formatAirTime(item.airingAt)}</strong></span>
          </div>
        </div>

        <Link
          to={`/watch/${item.media.id}/${item.episode}`}
          className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition shrink-0 cursor-pointer"
          title="Watch Episode"
        >
          <Play className="w-4 h-4 fill-white ml-0.5" />
        </Link>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Top Header & View Toggle Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
            <Calendar className="w-6 h-6 text-purple-400" />
            Weekly Anime Release Schedule
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track upcoming release times for tomorrow, the day after, and past broadcasts.
          </p>
        </div>

        {/* View Mode Toggle Switch */}
        <div className="flex items-center gap-1 bg-[#0D0D12] p-1 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'daily'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily View</span>
          </button>
          <button
            onClick={() => setViewMode('upcoming')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'upcoming'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Upcoming (Tomorrow & Day After)</span>
          </button>
        </div>
      </div>

      {viewMode === 'daily' ? (
        <>
          {/* 7-Day Date Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {weekDays.map((day) => {
              const isSelected = day.dateTimestamp === selectedDayTimestamp;
              return (
                <button
                  key={day.dateTimestamp}
                  onClick={() => setSelectedDayTimestamp(day.dateTimestamp)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex flex-col items-center gap-0.5 cursor-pointer min-w-[80px] ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40 scale-105'
                      : 'bg-[#0D0D12] text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{day.dayName}</span>
                    <span className="text-[10px] opacity-80 font-normal">{day.dateStr}</span>
                  </div>
                  {day.isToday ? (
                    <span className="text-[9px] uppercase tracking-wider text-purple-200 font-black bg-purple-900/60 px-1.5 py-0.5 rounded-full">
                      Today
                    </span>
                  ) : day.isTomorrow ? (
                    <span className="text-[9px] uppercase tracking-wider text-amber-300 font-black bg-amber-950/60 px-1.5 py-0.5 rounded-full">
                      Tomorrow
                    </span>
                  ) : day.isDayAfterTomorrow ? (
                    <span className="text-[9px] uppercase tracking-wider text-indigo-300 font-black bg-indigo-950/60 px-1.5 py-0.5 rounded-full">
                      In 2 Days
                    </span>
                  ) : day.isYesterday ? (
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
                      Yesterday
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Selected Day Header */}
          {selectedDayObj && (
            <div className="flex items-center justify-between bg-[#0D0D12] border border-slate-800/80 px-4 py-2.5 rounded-2xl text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-300">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>
                  Schedule for <strong className="text-white">{selectedDayObj.dayName}, {selectedDayObj.dateStr}</strong>
                  {selectedDayObj.isToday && <span className="text-purple-400 font-extrabold ml-1.5">(Today)</span>}
                  {selectedDayObj.isTomorrow && <span className="text-amber-400 font-extrabold ml-1.5">(Tomorrow)</span>}
                  {selectedDayObj.isDayAfterTomorrow && <span className="text-indigo-400 font-extrabold ml-1.5">(In 2 Days)</span>}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">
                {daySchedule.length} release{daySchedule.length === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {/* Single Day Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : daySchedule.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {daySchedule.map(renderScheduleCard)}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#0D0D12] rounded-3xl border border-slate-900 space-y-2">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-300 text-sm font-bold">
                No anime releases scheduled for {selectedDayObj ? `${selectedDayObj.dayName}, ${selectedDayObj.dateStr}` : 'this day'}.
              </p>
              <p className="text-slate-500 text-xs">
                Check neighboring days or click <button onClick={() => setViewMode('upcoming')} className="text-purple-400 font-semibold underline">Upcoming View</button> to see future releases.
              </p>
            </div>
          )}
        </>
      ) : (
        /* Combined View: Tomorrow & Day After Tomorrow placed together! */
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Tomorrow Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h2 className="text-base font-extrabold text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Tomorrow's Upcoming Releases {tomorrowObj && `(${tomorrowObj.dayName}, ${tomorrowObj.dateStr})`}
              </h2>
              <span className="text-xs text-slate-400 font-bold bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-xl">
                {tomorrowItems.length} Episodes
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              </div>
            ) : tomorrowItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {tomorrowItems.map(renderScheduleCard)}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4">No releases scheduled for tomorrow.</p>
            )}
          </div>

          {/* Day After Tomorrow Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h2 className="text-base font-extrabold text-indigo-300 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-indigo-400" />
                The Day After Tomorrow {dayAfterTomorrowObj && `(${dayAfterTomorrowObj.dayName}, ${dayAfterTomorrowObj.dateStr})`}
              </h2>
              <span className="text-xs text-slate-400 font-bold bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-1 rounded-xl">
                {dayAfterTomorrowItems.length} Episodes
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              </div>
            ) : dayAfterTomorrowItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {dayAfterTomorrowItems.map(renderScheduleCard)}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4">No releases scheduled for the day after tomorrow.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
