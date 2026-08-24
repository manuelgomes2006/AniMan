import React from 'react';
import { AudioVariant } from '../../types/stream';
import { Volume2, AlertCircle } from 'lucide-react';

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
    <div className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
        <Volume2 className="w-4 h-4 text-purple-400" />
        <span>Audio Language</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* SUB Button */}
        <button
          onClick={() => onChangeVariant('sub')}
          className={`p-3 rounded-xl border text-left transition-all duration-200 ${
            currentVariant === 'sub'
              ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40 text-white'
              : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm">SUB</span>
            <span className="text-[10px] font-semibold text-purple-400 uppercase">Japanese</span>
          </div>
          <p className="text-[11px] opacity-75 mt-0.5">Original Audio with Subtitles</p>
        </button>

        {/* DUB Button */}
        <button
          onClick={() => isDubAvailable && onChangeVariant('dub')}
          disabled={!isDubAvailable}
          className={`p-3 rounded-xl border text-left transition-all duration-200 relative ${
            !isDubAvailable
              ? 'opacity-40 cursor-not-allowed bg-[#050507] border-slate-900 text-slate-600'
              : currentVariant === 'dub'
              ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40 text-white'
              : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm">DUB</span>
            <span className="text-[10px] font-semibold text-purple-400 uppercase">English</span>
          </div>
          <p className="text-[11px] opacity-75 mt-0.5">
            {isDubAvailable ? 'English Dubbed Audio' : 'DUB unavailable for this episode'}
          </p>
        </button>
      </div>

      {!isDubAvailable && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 font-medium pt-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>English Dub is currently unavailable for this episode. Defaulted to SUB.</span>
        </div>
      )}
    </div>
  );
}
