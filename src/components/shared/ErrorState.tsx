import React from 'react';
import { AlertTriangle, RotateCcw, Server } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onChangeServer?: () => void;
}

export default function ErrorState({
  title = 'Unable to Load Stream Source',
  message = 'No playable source is currently available from this server. Please try switching servers or refresh.',
  onRetry,
  onChangeServer
}: ErrorStateProps) {
  return (
    <div className="w-full aspect-video bg-[#0D0D12] border border-slate-800/80 rounded-2xl sm:rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
      <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-rose-500" />
      </div>

      <div className="space-y-1 max-w-md">
        <h3 className="font-bold text-base text-white">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
        )}

        {onChangeServer && (
          <button
            onClick={onChangeServer}
            className="flex items-center gap-2 bg-[#050507] hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold px-5 py-2.5 rounded-xl transition"
          >
            <Server className="w-3.5 h-3.5 text-purple-400" />
            Change Server
          </button>
        )}
      </div>
    </div>
  );
}
