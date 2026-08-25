import { ProviderConfig, ProviderHealth, ProviderStatus } from './providerTypes';

/**
 * Verified Authorized Embed Hosts Allowlist (Empty - All streaming provider data removed)
 */
export const ALLOWED_EMBED_HOSTS: string[] = [];

/**
 * Centralized Provider Configuration Registry (Empty - All streaming provider data removed)
 */
export const VIDEO_PROVIDERS: ProviderConfig[] = [];

const PREFERRED_PROVIDER_KEY = 'aniworld_preferred_provider';
const HEALTH_STORAGE_KEY = 'aniworld_provider_health';

/**
 * Domain Allowlist & HTTPS Validator Function
 */
export function isAllowedEmbedUrl(url: string, providerId?: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_EMBED_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`)
    );
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
  return [];
}

export function getPreferredProviderId(): string {
  return localStorage.getItem(PREFERRED_PROVIDER_KEY) || '';
}

export function setPreferredProviderId(providerId: string): void {
  localStorage.setItem(PREFERRED_PROVIDER_KEY, providerId);
}
