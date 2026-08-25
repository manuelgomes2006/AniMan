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
 * Centralized Provider Configuration & Status Classification
 */
export const VIDEO_PROVIDERS: ProviderConfig[] = [
  {
    id: 'anilink',
    name: 'AniLink HD',
    enabled: true,
    priority: 1,
    allowedDomains: ['anilink.cc'],
    status: 'available',
    verified: true,
    requiresAuth: false,
  },
  {
    id: 'twoembed',
    name: '2Embed HD',
    enabled: true,
    priority: 2,
    allowedDomains: ['www.2embed.cc', '2embed.cc'],
    status: 'available',
    verified: true,
    requiresAuth: false,
  },
  {
    id: 'vidcloud',
    name: 'VidSrc HD',
    enabled: true,
    priority: 3,
    allowedDomains: ['vidsrc.cc'],
    status: 'blocked_by_provider',
    verified: true,
    requiresAuth: false,
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed HD',
    enabled: true,
    priority: 4,
    allowedDomains: ['player.autoembed.cc', 'autoembed.cc'],
    status: 'offline',
    verified: true,
    requiresAuth: false,
  },
  {
    id: 'megacloud',
    name: 'MegaCloud HD',
    enabled: true,
    priority: 5,
    allowedDomains: ['megacloud.blog', 'megacloud.cc'],
    status: 'offline',
    verified: true,
    requiresAuth: false,
  },
  {
    id: 'kiwi',
    name: 'Kiwi / Kwik',
    enabled: false,
    priority: 6,
    allowedDomains: ['kwik.cx', 'kiwi.mobi'],
    status: 'not_verified',
    verified: false,
    requiresAuth: true,
  },
  {
    id: 'vidplay',
    name: 'VidPlay HD',
    enabled: false,
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

    // 1. Must be HTTPS
    if (parsed.protocol !== 'https:') return false;

    // 2. Validate hostname against ALLOWED_EMBED_HOSTS allowlist
    const hostname = parsed.hostname.toLowerCase();
    const isAllowlisted = ALLOWED_EMBED_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`)
    );

    if (!isAllowlisted) return false;

    // 3. Optional provider-specific domain validation
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

// Alias for backward compatibility
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
 * Get Ranked Providers ordered by Enablement, Priority, and Health
 */
export function getRankedProviders(): ProviderConfig[] {
  const healthMap = getProviderHealth();

  return [...VIDEO_PROVIDERS]
    .filter((p) => p.enabled && p.status !== 'blocked_by_provider' && p.status !== 'offline')
    .sort((a, b) => {
      const healthA = healthMap[a.id];
      const healthB = healthMap[b.id];

      const failRatioA = healthA ? healthA.failureCount / Math.max(1, healthA.successCount + healthA.failureCount) : 0;
      const failRatioB = healthB ? healthB.failureCount / Math.max(1, healthB.successCount + healthB.failureCount) : 0;

      if (failRatioA > 0.8 && failRatioB <= 0.8) return 1;
      if (failRatioB > 0.8 && failRatioA <= 0.8) return -1;

      return a.priority - b.priority;
    });
}

export function getPreferredProviderId(): string {
  return localStorage.getItem(PREFERRED_PROVIDER_KEY) || 'anilink';
}

export function setPreferredProviderId(providerId: string): void {
  localStorage.setItem(PREFERRED_PROVIDER_KEY, providerId);
}
