import React from 'react';

export default function DebugPlayerPage() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6 text-white font-sans">
      <div className="space-y-2 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <span>🔍 AniWorld Standalone Diagnostic Suite</span>
        </h1>
        <p className="text-xs text-slate-400">
          All third-party video streaming provider data and embed configurations have been completely removed from AniWorld per user request.
        </p>
      </div>

      <div className="bg-[#0D0D12] border border-slate-800 rounded-2xl p-6 text-center space-y-3">
        <span className="bg-purple-950 text-purple-300 border border-purple-800 text-xs font-bold px-3 py-1 rounded-xl">
          Providers Removed
        </span>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          No external streaming providers are currently configured in the application registry.
        </p>
      </div>
    </div>
  );
}
