import React from 'react';
import { Server, Zap, Shield, Globe, PlayCircle } from 'lucide-react';

interface ServerSelectorProps {
  currentServer: string;
  onSelectServer: (serverId: string) => void;
}

export default function ServerSelector({ currentServer, onSelectServer }: ServerSelectorProps) {
  const servers = [
    {
      id: 'server-1',
      name: 'Server 1 (AniLink Primary)',
      tag: 'Fast 1080p',
      icon: Zap
    },
    {
      id: 'server-2',
      name: 'Server 2 (VidStream / MegaCloud)',
      tag: 'Multi-Sub',
      icon: Shield
    },
    {
      id: 'server-3',
      name: 'Server 3 (2Embed Mirror)',
      tag: 'MAL Stream',
      icon: Globe
    },
    {
      id: 'server-4',
      name: 'Server 4 (Streamtape HLS)',
      tag: 'Backup Direct',
      icon: PlayCircle
    },
  ];

  return (
    <div className="bg-[#0D0D12] border border-slate-800/90 rounded-2xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-300 font-extrabold text-xs">
          <Server className="w-3.5 h-3.5 text-purple-400" />
          <span>Select Streaming Server</span>
        </div>
        <span className="text-[10px] text-purple-400 font-bold bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded-full">
          4 Providers Active
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {servers.map((srv) => {
          const isSelected = currentServer === srv.id;
          const IconComponent = srv.icon;
          return (
            <button
              key={srv.id}
              onClick={() => onSelectServer(srv.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/60 border border-purple-400/50'
                  : 'bg-[#050507] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-purple-400'}`} />
              <div className="flex flex-col items-start leading-tight">
                <span>{srv.name}</span>
                <span className={`text-[9px] font-medium ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                  {srv.tag}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
