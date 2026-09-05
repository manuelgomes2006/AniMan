import { ProviderConfig, ProviderHealth, ProviderStatus } from './providerTypes';

/**
 * Domain Allowlist for Verified Provider Embed Hosts
 */
export const ALLOWED_EMBED_HOSTS: string[] = ['anilink.cc', 'vidsrc.pm', 'vidsrc.cc', 'megaplay.buzz'];

/**
 * Registered Provider Adapter Configurations
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
    id: 'vidsrc',
    name: 'VidSrc HD',
    enabled: true,
    priority: 2,
    allowedDomains: ['vidsrc.pm', 'vidsrc.cc'],
    status: 'available',
    verified: true,
    requiresAuth: false,
  },
  {
    id: 'megaplay',
    name: 'MegaPlay HD',
    enabled: true,
    priority: 3,
    allowedDomains: ['megaplay.buzz'],
    status: 'degraded',
    verified: false,
    requiresAuth: false,
  },
];

const PREFERRED_PROVIDER_KEY = 'aniworld_preferred_provider';
const HEALTH_STORAGE_KEY = 'aniworld_provider_health';

/**
 * Domain Allowlist & HTTPS Security Validator
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
    console.warn('Health record notice:', err);
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
    console.warn('Health record notice:', err);
  }
}

export function getRankedProviders(): ProviderConfig[] {
  return [...VIDEO_PROVIDERS].filter((p) => p.enabled && p.status === 'available');
}

export function getPreferredProviderId(): string {
  return localStorage.getItem(PREFERRED_PROVIDER_KEY) || 'megaplay';
}

export function setPreferredProviderId(providerId: string): void {
  localStorage.setItem(PREFERRED_PROVIDER_KEY, providerId);
}
