import { ProviderConfig, ProviderHealth, ProviderStatus } from './providerTypes';

/**
 * Verified Authorized Embed Hosts Allowlist
 * Only documented/authorized hosts permitting iframe embedding are included.
 */
export const ALLOWED_EMBED_HOSTS = [
  'anilink.cc',
  'www.2embed.cc',
  '2embed.cc',
  'vidsrc.cc',
  'player.autoembed.cc',
  'megacloud.blog',
];

/**
 * Centralized Provider Configuration & Honest Status Classification
 * Providers are evaluated for X-Frame-Options, CSP frame-ancestors, JS frame-busting,
 * Cloudflare challenges, DNS availability, and route mapping validity.
 */
export const VIDEO_PROVIDERS: ProviderConfig[] = [
  {
    id: 'anilink',
    name: 'AniLink HD',
    enabled: false, // Route mapping requires slug title rather than numeric AniList ID
    priority: 1,
    allowedDomains: ['anilink.cc'],
    status: 'invalid_url',
    verified: false,
    requiresAuth: false,
  },
  {
    id: 'twoembed',
    name: '2Embed HD',
    enabled: false, // Contains JavaScript frame-busting (if (top !== self)) blocking iframe embedding
    priority: 2,
    allowedDomains: ['www.2embed.cc', '2embed.cc'],
    status: 'blocked_by_provider',
    verified: false,
    requiresAuth: false,
  },
  {
    id: 'vidcloud',
    name: 'VidSrc HD',
    enabled: false, // Returns Cloudflare HTTP 522 Origin Error & X-Frame-Options: SAMEORIGIN
    priority: 3,
    allowedDomains: ['vidsrc.cc'],
    status: 'blocked_by_provider',
    verified: false,
    requiresAuth: false,
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed HD',
    enabled: false, // DNS resolution failure (ENOTFOUND getaddrinfo player.autoembed.cc)
    priority: 4,
    allowedDomains: ['player.autoembed.cc', 'autoembed.cc'],
    status: 'offline',
    verified: false,
    requiresAuth: false,
  },
  {
    id: 'megacloud',
    name: 'MegaCloud HD',
    enabled: false, // Cloudflare HTTP 523 Origin Unreachable & X-Frame-Options: SAMEORIGIN
    priority: 5,
    allowedDomains: ['megacloud.blog', 'megacloud.cc'],
    status: 'offline',
    verified: false,
    requiresAuth: false,
  },
  {
    id: 'kiwi',
    name: 'Kiwi / Kwik',
    enabled: false, // Marked disabled until credentials/configuration verified
    priority: 6,
    allowedDomains: ['kwik.cx', 'kiwi.mobi'],
    status: 'not_verified',
    verified: false,
    requiresAuth: true,
  },
  {
    id: 'vidplay',
    name: 'VidPlay HD',
    enabled: false, // Marked disabled until credentials/configuration verified
    priority: 7,
    allowedDomains: ['vidplay.online', 'vidplay.site'],
    status: 'not_verified',
    verified: false,
    requiresAuth: true,
  },
];

const PREFERRED_PROVIDER_KEY = 'aniworld_preferred_provider';
const HEALTH_STORAGE_KEY = 'aniworld_provider_health';

/**
 * Domain Allowlist & HTTPS Validator Function
 * Strictly validates protocol and hostname against ALLOWED_EMBED_HOSTS.
 */
export function isAllowedEmbedUrl(url: string, providerId?: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    const isAllowlisted = ALLOWED_EMBED_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`)
    );

    if (!isAllowlisted) return false;

    if (providerId) {
      const config = VIDEO_PROVIDERS.find((p) => p.id === providerId);
      if (config) {
        return config.allowedDomains.some(
          (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
        );
      }
    }

    return true;
  } catch {
    return false;
  }
}

export const validateEmbedUrl = isAllowedEmbedUrl;

/**
 * Lightweight Provider Health Tracking
 */
export function getProviderHealth(): Record<string, ProviderHealth> {
  try {
    const raw = localStorage.getItem(HEALTH_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function recordProviderSuccess(providerId: string): void {
  try {
    const healthMap = getProviderHealth();
    const existing = healthMap[providerId] || {
      providerId,
      successCount: 0,
      failureCount: 0,
    };

    healthMap[providerId] = {
      ...existing,
      successCount: existing.successCount + 1,
      lastSuccess: new Date().toISOString(),
    };

    localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(healthMap));
  } catch (err) {
    console.warn('Health record success notice:', err);
  }
}

export function recordProviderFailure(providerId: string): void {
  try {
    const healthMap = getProviderHealth();
    const existing = healthMap[providerId] || {
      providerId,
      successCount: 0,
      failureCount: 0,
    };

    healthMap[providerId] = {
      ...existing,
      failureCount: existing.failureCount + 1,
      lastFailure: new Date().toISOString(),
    };

    localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(healthMap));
  } catch (err) {
    console.warn('Health record failure notice:', err);
  }
}

/**
 * Get Ranked Available Providers
 * Only returns providers where status === 'available' and enabled === true.
 */
export function getRankedProviders(): ProviderConfig[] {
  return [...VIDEO_PROVIDERS]
    .filter((p) => p.enabled && p.status === 'available')
    .sort((a, b) => a.priority - b.priority);
}

export function getPreferredProviderId(): string {
  return localStorage.getItem(PREFERRED_PROVIDER_KEY) || 'autoembed';
}

export function setPreferredProviderId(providerId: string): void {
  localStorage.setItem(PREFERRED_PROVIDER_KEY, providerId);
}
