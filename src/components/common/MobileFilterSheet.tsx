import React from 'react';
import { X, Filter, Check } from 'lucide-react';
import { ANIME_GENRES } from '../../services/anilist/client';

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    genre: string;
    format: string;
    status: string;
    sort: string;
  };
  onApply: (updated: { genre: string; format: string; status: string; sort: string }) => void;
}

export default function MobileFilterSheet({ isOpen, onClose, filters, onApply }: MobileFilterSheetProps) {
  if (!isOpen) return null;

  const [genre, setGenre] = React.useState(filters.genre || 'All');
  const [format, setFormat] = React.useState(filters.format || 'All');
  const [status, setStatus] = React.useState(filters.status || 'All');
  const [sort, setSort] = React.useState(filters.sort || 'POPULARITY_DESC');

  const handleSave = () => {
    onApply({ genre, format, status, sort });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      <div onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div className="relative bg-[#0D0D12] border-t border-slate-800 rounded-t-3xl p-5 z-10 max-h-[80vh] overflow-y-auto space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-400" />
            Anime Filter Options
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Genre Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Genre</label>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {['All', ...ANIME_GENRES].map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                  genre === g ? 'bg-purple-600 text-white' : 'bg-[#050507] text-slate-400 border border-slate-800'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Format Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Format</label>
          <div className="grid grid-cols-3 gap-2">
            {['All', 'TV', 'MOVIE', 'OVA', 'ONA'].map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`py-2 rounded-xl text-xs font-bold ${
                  format === f ? 'bg-purple-600 text-white' : 'bg-[#050507] text-slate-400 border border-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Status Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'All', label: 'All Statuses' },
              { id: 'RELEASING', label: 'Airing Now' },
              { id: 'FINISHED', label: 'Completed' },
              { id: 'NOT_YET_RELEASED', label: 'Upcoming' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                className={`py-2 rounded-xl text-xs font-bold ${
                  status === s.id ? 'bg-purple-600 text-white' : 'bg-[#050507] text-slate-400 border border-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Apply Button */}
        <button
          onClick={handleSave}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs py-3 rounded-2xl shadow-xl shadow-purple-950 flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Apply Filters
        </button>
      </div>
    </div>
  );
}
