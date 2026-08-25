import { ProviderConfig, ProviderHealth } from './providerTypes';

/**
 * Centralized Provider Configuration & Domain Allowlist Registry
 * Strictly enforces HTTPS-only authorized domains.
 */
export const VIDEO_PROVIDERS: ProviderConfig[] = [
  {
    id: 'autoembed',
    name: 'AutoEmbed HD',
    enabled: true,
    priority: 1,
    allowedDomains: ['player.autoembed.cc', 'autoembed.cc', '2embed.cc'],
    verified: true,
    requiresAuth: false,
  },
  {
    id: 'megacloud',
    name: 'MegaCloud HD',
    enabled: true,
    priority: 2,
    allowedDomains: ['megacloud.blog', 'megacloud.cc', 'megacloud.club', 'megacloud.tv'],
    verified: true,
    requiresAuth: false,
  },
  {
    id: 'vidcloud',
    name: 'VidCloud HD',
    enabled: true,
    priority: 3,
    allowedDomains: ['vidcloud.stream', 'vidcloud.icu', 'vidsrc.cc'],
    verified: true,
    requiresAuth: false,
  },
  {
    id: 'kiwi',
    name: 'Kiwi / Kwik',
    enabled: false, // Marked disabled until credentials/configuration verified
    priority: 4,
    allowedDomains: ['kwik.cx', 'kiwi.mobi'],
    verified: false,
    requiresAuth: true,
  },
  {
    id: 'vidplay',
    name: 'VidPlay HD',
    enabled: false, // Marked disabled until credentials/configuration verified
    priority: 5,
    allowedDomains: ['vidplay.online', 'vidplay.site'],
    verified: false,
    requiresAuth: true,
  },
];

const PREFERRED_PROVIDER_KEY = 'aniworld_preferred_provider';
const HEALTH_STORAGE_KEY = 'aniworld_provider_health';

/**
 * Domain Allowlist & HTTPS Validator
 * Prevents unauthorized or arbitrary URL injection into player iframes.
 */
export function validateEmbedUrl(url: string, providerId?: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);

    // 1. Must be HTTPS
    if (parsed.protocol !== 'https:') return false;

    // 2. Lookup provider config or use global allowlist
    const hostname = parsed.hostname.toLowerCase();
    const config = providerId ? VIDEO_PROVIDERS.find((p) => p.id === providerId) : null;

    if (config) {
      return config.allowedDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
    }

    // Global Allowlist Fallback
    const globalAllowedDomains = VIDEO_PROVIDERS.flatMap((p) => p.allowedDomains);
    return globalAllowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Provider Health Tracking Engine
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
    console.warn('Health record success error:', err);
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
    console.warn('Health record failure error:', err);
  }
}

/**
 * Get Ranked Providers ordered by Enablement, Priority, and Health
 */
export function getRankedProviders(): ProviderConfig[] {
  const healthMap = getProviderHealth();

  return [...VIDEO_PROVIDERS]
    .filter((p) => p.enabled)
    .sort((a, b) => {
      const healthA = healthMap[a.id];
      const healthB = healthMap[b.id];

      // Penalize providers with consecutive failures
      const failRatioA = healthA ? healthA.failureCount / Math.max(1, healthA.successCount + healthA.failureCount) : 0;
      const failRatioB = healthB ? healthB.failureCount / Math.max(1, healthB.successCount + healthB.failureCount) : 0;

      if (failRatioA > 0.8 && failRatioB <= 0.8) return 1;
      if (failRatioB > 0.8 && failRatioA <= 0.8) return -1;

      return a.priority - b.priority;
    });
}

/**
 * Remember Selected Provider Preference
 */
export function getPreferredProviderId(): string {
  return localStorage.getItem(PREFERRED_PROVIDER_KEY) || 'autoembed';
}

export function setPreferredProviderId(providerId: string): void {
  localStorage.setItem(PREFERRED_PROVIDER_KEY, providerId);
}
