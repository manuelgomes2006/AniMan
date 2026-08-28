import React from 'react';
import { Check } from 'lucide-react';
import { Language } from '../../services/streaming/providerTypes';

interface SubDubControlsProps {
  activeLanguage?: Language | null;
  currentVariant?: Language;
  audioVariant?: Language;
  hasSub?: boolean;
  hasDub?: boolean;
  isDubAvailable?: boolean;
  onSelectLanguage?: (language: Language) => void;
  onAudioChange?: (language: Language) => void;
  onChangeVariant?: (language: Language) => void;
  onSelectVariant?: (language: Language) => void;
}

export default function SubDubControls({
  activeLanguage,
  currentVariant,
  audioVariant,
  hasSub = true,
  hasDub = false,
  isDubAvailable,
  onSelectLanguage,
  onAudioChange,
  onChangeVariant,
  onSelectVariant
}: SubDubControlsProps) {
  const currentLang = activeLanguage || audioVariant || currentVariant || 'sub';
  const handleSelect = onSelectLanguage || onAudioChange || onChangeVariant || onSelectVariant || (() => {});
  const showDub = isDubAvailable !== undefined ? isDubAvailable : hasDub;

  if (!hasSub && !showDub) return null;

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

      {/* Conditional SUB & DUB Buttons */}
      <div className="flex items-center gap-2.5">
        {/* SUB Button — rendered ONLY when hasSub is true */}
        {hasSub && (
          <button
            type="button"
            onClick={() => handleSelect('sub')}
            aria-pressed={currentLang === 'sub'}
            className={`flex-1 p-2.5 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
              currentLang === 'sub'
                ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40 font-black'
                : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <span className="font-extrabold text-xs sm:text-sm tracking-wide">SUB</span>
            <span className={`text-[9px] font-semibold uppercase mt-0.5 ${currentLang === 'sub' ? 'text-purple-200' : 'text-slate-500'}`}>
              Japanese
            </span>
          </button>
        )}

        {/* DUB Button — rendered ONLY when hasDub is true */}
        {showDub && (
          <button
            type="button"
            onClick={() => handleSelect('dub')}
            aria-pressed={currentLang === 'dub'}
            className={`flex-1 p-2.5 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
              currentLang === 'dub'
                ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40 font-black'
                : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <span className="font-extrabold text-xs sm:text-sm tracking-wide">DUB</span>
            <span className={`text-[9px] font-semibold uppercase mt-0.5 ${currentLang === 'dub' ? 'text-purple-200' : 'text-slate-500'}`}>
              English
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
