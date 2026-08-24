import React from 'react';
import { AudioVariant } from '../../types/stream';
import { Volume2, AlertCircle, Edit3, Check } from 'lucide-react';

interface SubDubControlsProps {
  currentVariant: AudioVariant;
  isDubAvailable: boolean;
  onChangeVariant: (variant: AudioVariant) => void;
}

export default function SubDubControls({
  currentVariant,
  isDubAvailable,
  onChangeVariant
}: SubDubControlsProps) {
  return (
    <div className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-md">
      {/* Top Title & Preference Header (Matching Mockup 2 format) */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-extrabold text-slate-300 uppercase tracking-wider">AUDIO</span>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Prefer Sub</span>
          <Edit3 className="w-3 h-3 text-slate-400" />
        </div>
      </div>

      {/* SUB & DUB Buttons (Matching Mockup 2 grid style) */}
      <div className="grid grid-cols-2 gap-3">
        {/* SUB Button */}
        <button
          onClick={() => onChangeVariant('sub')}
          className={`p-3 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center ${
            currentVariant === 'sub'
              ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40'
              : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <span className="font-extrabold text-sm sm:text-base tracking-wide">SUB</span>
          <span className={`text-[10px] font-semibold uppercase mt-0.5 ${currentVariant === 'sub' ? 'text-purple-200' : 'text-slate-500'}`}>
            Japanese
          </span>
        </button>

        {/* DUB Button */}
        <button
          onClick={() => isDubAvailable && onChangeVariant('dub')}
          disabled={!isDubAvailable}
          className={`p-3 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center relative ${
            !isDubAvailable
              ? 'opacity-40 cursor-not-allowed bg-[#050507] border-slate-900 text-slate-600'
              : currentVariant === 'dub'
              ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40'
              : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <span className="font-extrabold text-sm sm:text-base tracking-wide">DUB</span>
          <span className={`text-[10px] font-semibold uppercase mt-0.5 ${currentVariant === 'dub' ? 'text-purple-200' : 'text-slate-500'}`}>
            {isDubAvailable ? 'English' : 'DUB unavailable'}
          </span>
        </button>
      </div>

      {/* Status indicator (Matching Mockup 2 "Default" text) */}
      <div className="flex items-center justify-end text-[10px] text-purple-400 font-semibold pt-0.5">
        <span className="flex items-center gap-1">
          <Check className="w-3 h-3 text-purple-400" />
          Default
        </span>
      </div>
    </div>
  );
}
