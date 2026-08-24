import React from 'react';
import { AudioVariant } from '../../types/stream';
import { Edit3, Check } from 'lucide-react';

interface SubDubControlsProps {
  currentVariant: 'sub' | 'dub';
  isDubAvailable?: boolean;
  hasDub?: boolean;
  onChangeVariant?: (variant: 'sub' | 'dub') => void;
  onSelectVariant?: (variant: 'sub' | 'dub') => void;
}

export default function SubDubControls({
  currentVariant,
  isDubAvailable,
  hasDub,
  onChangeVariant,
  onSelectVariant
}: SubDubControlsProps) {
  const dubAllowed = isDubAvailable !== undefined ? isDubAvailable : (hasDub !== undefined ? hasDub : true);
  const handleVariantChange = onChangeVariant || onSelectVariant || (() => {});

  return (
    <div className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-extrabold text-slate-300 uppercase tracking-wider">AUDIO TRACK</span>
        <div className="flex items-center gap-1 text-[10px] text-purple-400 font-semibold">
          <Check className="w-3 h-3 text-purple-400" />
          <span>Preferred Audio</span>
        </div>
      </div>

      {/* SUB & DUB Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* SUB Button */}
        <button
          type="button"
          onClick={() => handleVariantChange('sub')}
          className={`p-2.5 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
            currentVariant === 'sub'
              ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40 font-black'
              : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <span className="font-extrabold text-xs sm:text-sm tracking-wide">SUB</span>
          <span className={`text-[9px] font-semibold uppercase mt-0.5 ${currentVariant === 'sub' ? 'text-purple-200' : 'text-slate-500'}`}>
            Japanese
          </span>
        </button>

        {/* DUB Button */}
        <button
          type="button"
          onClick={() => dubAllowed && handleVariantChange('dub')}
          disabled={!dubAllowed}
          className={`p-2.5 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center relative cursor-pointer ${
            !dubAllowed
              ? 'opacity-40 cursor-not-allowed bg-[#050507] border-slate-900 text-slate-600'
              : currentVariant === 'dub'
              ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40 font-black'
              : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <span className="font-extrabold text-xs sm:text-sm tracking-wide">DUB</span>
          <span className={`text-[9px] font-semibold uppercase mt-0.5 ${currentVariant === 'dub' ? 'text-purple-200' : 'text-slate-500'}`}>
            {dubAllowed ? 'English' : 'Unavailable'}
          </span>
        </button>
      </div>
    </div>
  );
}
