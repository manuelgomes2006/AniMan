import React, { useState } from 'react';
import { VIDEO_PROVIDERS } from '../services/streaming/providerRegistry';
import { ProviderStatus } from '../services/streaming/providerTypes';

interface DebugProviderTest {
  id: string;
  name: string;
  directUrl: string;
  status: ProviderStatus;
  rootCause: string;
}

export default function DebugPlayerPage() {
  const [selectedTestId, setSelectedTestId] = useState<string>('anilink');

  const testSuite: DebugProviderTest[] = [
    {
      id: 'anilink',
      name: 'AniLink HD',
      directUrl: 'https://anilink.cc/watch/151807/6?variant=sub',
      status: 'invalid_url',
      rootCause: 'AniList numeric ID 151807 route does not exist on AniLink (returns Next.js shell without player embed).'
    },
    {
      id: 'twoembed',
      name: '2Embed HD',
      directUrl: 'https://www.2embed.cc/embed/anime/151807/6',
      status: 'blocked_by_provider',
      rootCause: 'Contains JavaScript frame-busting protection (if (window.top !== window.self)) which blocks third-party iframe rendering.'
    },
    {
      id: 'vidcloud',
      name: 'VidSrc HD',
      directUrl: 'https://vidsrc.cc/v2/embed/anime/151807/6',
      status: 'blocked_by_provider',
      rootCause: 'Returns Cloudflare HTTP 522 Origin Error and X-Frame-Options: SAMEORIGIN header blocking iframe embedding.'
    },
    {
      id: 'autoembed',
      name: 'AutoEmbed HD',
      directUrl: 'https://player.autoembed.cc/embed/anime/151807/6',
      status: 'offline',
      rootCause: 'DNS resolution failure (ENOTFOUND getaddrinfo player.autoembed.cc).'
    },
    {
      id: 'megacloud',
      name: 'MegaCloud HD',
      directUrl: 'https://megacloud.blog/embed/anime/151807/6',
      status: 'offline',
      rootCause: 'Cloudflare HTTP 523 Origin Unreachable Error & X-Frame-Options: SAMEORIGIN header.'
    },
    {
      id: 'kiwi',
      name: 'Kiwi / Kwik',
      directUrl: 'https://kwik.cx/e/151807/6',
      status: 'requires_authentication',
      rootCause: 'Unverified configuration. Requires server API key credential (KIWI_API_KEY).'
    },
    {
      id: 'vidplay',
      name: 'VidPlay HD',
      directUrl: 'https://vidplay.online/e/151807/6',
      status: 'requires_authentication',
      rootCause: 'Unverified configuration. Requires server API key credential (VIDPLAY_API_KEY).'
    }
  ];

  const activeTest = testSuite.find((t) => t.id === selectedTestId) || testSuite[0];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8 text-white font-sans">
      <div className="space-y-2 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <span>🔍 AniWorld Standalone Iframe Embed Diagnostic Suite</span>
        </h1>
        <p className="text-xs text-slate-400">
          Isolates the video player from the rest of the application to test browser-level iframe behavior and verify provider restrictions.
        </p>
      </div>

      {/* Test Controls Selector */}
      <div className="flex flex-wrap gap-2">
        {testSuite.map((test) => (
          <button
            key={test.id}
            onClick={() => setSelectedTestId(test.id)}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
              selectedTestId === test.id
                ? 'bg-purple-600 border-purple-400 text-white shadow-lg'
                : 'bg-[#0D0D12] border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {test.name} ({test.status})
          </button>
        ))}
      </div>

      {/* Active Iframe Test Container */}
      <div className="space-y-4">
        <div className="bg-[#0D0D12] border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-extrabold text-purple-300">Active Test: {activeTest.name}</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 uppercase">
              Status: {activeTest.status}
            </span>
          </div>
          <p className="text-slate-400 font-mono text-[11px] truncate">Direct URL: {activeTest.directUrl}</p>
          <p className="text-amber-200/90 font-medium bg-amber-950/30 p-2 rounded-lg border border-amber-900/50">
            <strong>Root Cause:</strong> {activeTest.rootCause}
          </p>
        </div>

        {/* Standalone Iframe Element */}
        <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
          <iframe
            src={activeTest.directUrl}
            title={`Debug Player - ${activeTest.name}`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>

      {/* Empirical Provider Diagnostic Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase text-purple-400 tracking-wider">
          Empirical Browser & Server Diagnostic Matrix
        </h3>
        <div className="overflow-x-auto bg-[#0D0D12] border border-slate-800 rounded-2xl p-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#14141F] text-slate-300 uppercase font-black text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Provider</th>
                <th className="p-3">Direct URL</th>
                <th className="p-3">Iframe Result</th>
                <th className="p-3">Browser Error / Headers</th>
                <th className="p-3">Root Cause</th>
                <th className="p-3">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {testSuite.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/50">
                  <td className="p-3 font-bold text-white">{row.name}</td>
                  <td className="p-3 font-mono text-[10px] text-purple-300 truncate max-w-[150px]">{row.directUrl}</td>
                  <td className="p-3">
                    <span className="bg-rose-950/60 text-rose-300 border border-rose-800/60 text-[10px] font-bold px-2 py-0.5 rounded">
                      Fails / Blank
                    </span>
                  </td>
                  <td className="p-3 text-[11px] text-amber-300">Refused to Connect / 522 / JS Frame-Bust</td>
                  <td className="p-3 text-[11px] text-slate-400 max-w-xs">{row.rootCause}</td>
                  <td className="p-3 font-mono text-[10px] uppercase font-bold text-amber-400">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
