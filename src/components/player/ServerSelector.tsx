import React from 'react';
import { Server, Zap } from 'lucide-react';

interface ServerSelectorProps {
  currentServer: string;
  onSelectServer: (server: string) => void;
}

export default function ServerSelector({ currentServer, onSelectServer }: ServerSelectorProps) {
  const servers = [
    { id: 'server-1', name: 'VidStream .ll', type: 'Primary HD' },
    { id: 'server-2', name: 'MegaCloud', type: 'Backup 1080p' },
    { id: 'server-3', name: 'Streamtape', type: 'Fast Mirror' },
  ];

  return (
    <div className="bg-[#0D0D12] border border-slate-800/90 rounded-2xl p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-slate-300 font-extrabold text-xs">
        <Server className="w-3.5 h-3.5 text-purple-400" />
        <span>Servers</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {servers.map((srv) => {
          const isSelected = currentServer === srv.id;
          return (
            <button
              key={srv.id}
              onClick={() => onSelectServer(srv.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/60 border border-purple-400/50'
                  : 'bg-[#050507] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Zap className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-purple-400'}`} />
              <span>{srv.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
