import React, { useState } from 'react';
import { StreamingServerOption, AudioVariant } from '../../services/streaming/providerTypes';
import { Server, AlertTriangle, CheckCircle, WifiOff, Volume2, ShieldCheck, Flag } from 'lucide-react';

interface ServerSelectorProps {
  servers: StreamingServerOption[];
  activeSourceIndex: number;
  onSelectServer: (index: number) => void;
  audioVariant: AudioVariant;
  onAudioChange: (variant: AudioVariant) => void;
  episodeNumber: number;
}

export default function ServerSelector({
  servers,
  activeSourceIndex,
  onSelectServer,
  audioVariant,
  onAudioChange,
  episodeNumber,
}: ServerSelectorProps) {
  const [reportedServerId, setReportedServerId] = useState<string | null>(null);
  const [showReportToast, setShowReportToast] = useState(false);

  const handleReportServer = (serverId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReportedServerId(serverId);
    setShowReportToast(true);
    setTimeout(() => setShowReportToast(false), 4000);
  };

  return (
    <div className="bg-[#0D0D12] border border-slate-800/90 rounded-2xl p-4 space-y-3.5 shadow-xl font-sans">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Watch Episode {episodeNumber} • Select Server
          </h3>
        </div>

        {/* Audio Variant Sub/Dub Switcher */}
        <div className="flex items-center gap-1.5 bg-[#14141F] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onAudioChange('sub')}
            className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
              audioVariant === 'sub'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3 h-3" />
            <span>SUB</span>
          </button>
          <button
            onClick={() => onAudioChange('dub')}
            className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
              audioVariant === 'dub'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3 h-3" />
            <span>DUB</span>
          </button>
        </div>
      </div>

      {/* Server Tabs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {servers.map((server, idx) => {
          const isActive = idx === activeSourceIndex;
          const isOffline = server.status === 'offline';
          const isDegraded = server.status === 'degraded';

          return (
            <div
              key={server.id || idx}
              onClick={() => !isOffline && onSelectServer(idx)}
              className={`relative rounded-xl p-3 border transition cursor-pointer flex flex-col justify-between gap-2 select-none ${
                isActive
                  ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/50'
                  : isOffline
                  ? 'bg-slate-900/40 border-slate-800/50 opacity-50 cursor-not-allowed'
                  : 'bg-[#14141F] border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
              }`}
            >
              {/* Top Row: Name & Active Indicator */}
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-extrabold truncate ${isActive ? 'text-purple-300 font-black' : 'text-white'}`}>
                  {server.name}
                </span>

                {server.isVerified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" title="Verified Embed Provider" />
                )}
              </div>

              {/* Bottom Row: Status Tag & Sub/Dub Tag */}
              <div className="flex items-center justify-between gap-1 pt-1 text-[10px] font-bold">
                <div className="flex items-center gap-1">
                  {isOffline ? (
                    <span className="text-rose-400 flex items-center gap-0.5">
                      <WifiOff className="w-3 h-3" /> Offline
                    </span>
                  ) : isDegraded ? (
                    <span className="text-amber-400 flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> Backup
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> Online
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className="bg-slate-800 text-slate-300 uppercase px-1.5 py-0.5 rounded font-black text-[9px]">
                    {audioVariant.toUpperCase()}
                  </span>

                  {/* Report Broken Server Button */}
                  <button
                    onClick={(e) => handleReportServer(server.id, e)}
                    title="Report broken server"
                    className="p-1 text-slate-500 hover:text-amber-400 transition rounded"
                  >
                    <Flag className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Toast Notification */}
      {showReportToast && (
        <div className="bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs p-2.5 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Server issue logged for <strong className="text-white">{reportedServerId}</strong>. Switching automatically if stream fails...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
