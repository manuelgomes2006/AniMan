# AniWorld Multi-Provider Video Embedding System Setup Guide

This guide explains how the production-ready Multi-Provider Video Embedding System operates in AniWorld, including provider isolation, domain allowlisting, database schema migrations, and legal embedding practices.

---

## 🏛️ Architecture Overview

```text
Anime Request (Anime ID, Episode #, SUB/DUB)
     │
     ▼
Secure Server Endpoint (/api/episodes/:id/sources)
     │
     ├─► Domain Allowlist Validator (HTTPS + Allowed Domains Check)
     ├─► VideoProvider Registry (AutoEmbed, MegaCloud, VidCloud, Kiwi, VidPlay)
     └─► Health Tracker & Priority Ranker
     │
     ▼
Sanitized EpisodeSources Response
     │
     ▼
React Watch Page & Player UI
     ├─► ServerSelector Tabs ([ AutoEmbed ] [ MegaCloud ] [ VidCloud ])
     ├─► Automated Provider Fallback Trigger
     └─► Responsive Authorized Embed Iframe (strict-origin-when-cross-origin)
```

---

## 🔐 Legal Embedding & Domain Security Safeguards

1. **HTTPS & Domain Allowlisting**:
   - Every embed URL is strictly validated against the `allowedDomains` list registered in `src/services/streaming/providerRegistry.ts`.
   - Arbitrary or unverified third-party iframe URLs are automatically rejected before reaching the video player.

2. **No Technical Protection Bypass**:
   - DRM, CAPTCHA, authentication paywalls, CORS restrictions, or anti-bot protections are **never** bypassed.
   - Unverified providers requiring API keys (e.g. `KiwiProvider`, `VidPlayProvider`) default to `enabled: false` until valid authorized server credentials (`KIWI_API_KEY`, `VIDPLAY_API_KEY`) are supplied.

3. **Strict Iframe Sandbox & Referrer Policy**:
   ```html
   <iframe
     src="AUTHORIZED_EMBED_URL"
     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
     allowfullscreen
     loading="lazy"
     referrerpolicy="strict-origin-when-cross-origin">
   </iframe>
   ```

---

## ⚙️ Provider Configuration

Registered providers are defined in `src/services/streaming/providerRegistry.ts`:

```ts
export const VIDEO_PROVIDERS: ProviderConfig[] = [
  {
    id: 'autoembed',
    name: 'AutoEmbed HD',
    enabled: true,
    priority: 1,
    allowedDomains: ['player.autoembed.cc', 'autoembed.cc', '2embed.cc'],
    verified: true,
  },
  {
    id: 'megacloud',
    name: 'MegaCloud HD',
    enabled: true,
    priority: 2,
    allowedDomains: ['megacloud.blog', 'megacloud.cc', 'megacloud.club'],
    verified: true,
  },
  {
    id: 'vidcloud',
    name: 'VidCloud HD',
    enabled: true,
    priority: 3,
    allowedDomains: ['vidcloud.stream', 'vidcloud.icu', 'vidsrc.cc'],
    verified: true,
  },
  {
    id: 'kiwi',
    name: 'Kiwi / Kwik',
    enabled: false, // Disabled until KIWI_API_KEY configured
    priority: 4,
    allowedDomains: ['kwik.cx', 'kiwi.mobi'],
    verified: false,
    requiresAuth: true,
  },
  {
    id: 'vidplay',
    name: 'VidPlay HD',
    enabled: false, // Disabled until VIDPLAY_API_KEY configured
    priority: 5,
    allowedDomains: ['vidplay.online', 'vidplay.site'],
    verified: false,
    requiresAuth: true,
  },
];
```

To enable additional providers:
1. Supply the authorized credential in your server environment variables (`.env`).
2. Set `enabled: true` and `verified: true` in `providerRegistry.ts`.

---

## 🗄️ Database Setup (Supabase)

To enable persistent database source mapping and provider health tracking in Supabase, execute `supabase_schema.sql` in your Supabase SQL Editor.

This creates:
- `public.episode_sources`
- `public.provider_health`
- Indexes on `episode_id`, `provider_id`, and `enabled`.
- Public RLS read policies for episode sources and provider health.

---

## 🚀 Verification Commands

To verify that the project builds cleanly with zero TypeScript errors:

```bash
cmd /c npx vite build
```
