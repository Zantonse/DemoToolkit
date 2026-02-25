/**
 * Okta API Helper Functions
 *
 * Shared utilities for making Okta API calls across all scripts.
 */

import type { OktaConfig } from '../../../lib/types/okta';

// ============================================================================
// Okta API Types
// ============================================================================

export type OktaAuthenticator = {
  id: string;
  key: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
};

export type OktaGroup = {
  id: string;
  profile: {
    name: string;
    description?: string;
    [key: string]: unknown;
  };
};

export type OktaRoleAssignment = {
  id: string;
  type: string;
  label: string;
  status: string;
};

export type OktaPolicy = {
  id: string;
  name: string;
  type: string;
  _embedded?: {
    resourceType?: string;
    [key: string]: unknown;
  };
};

export type OktaApp = {
  id: string;
  name: string;
  label: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize org URL by removing trailing slashes
 */
export function normalizeOrgUrl(orgUrl: string): string {
  return orgUrl.replace(/\/+$/, '');
}

/**
 * Build standard Okta API headers with SSWS authentication
 */
export function oktaHeaders(config: OktaConfig): HeadersInit {
  return {
    Authorization: `SSWS ${config.apiToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

/**
 * Safely parse JSON from a response, returning null on failure
 */
export async function safeJson<T = unknown>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Generic Okta fetch wrapper with consistent error handling
 */
export async function oktaFetch<T = unknown>(
  config: OktaConfig,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SSWS ${config.apiToken}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Okta API error ${res.status} ${res.statusText} for ${path}: ${text || 'no body'}`
    );
  }

  return (await res.json()) as T;
}

/**
 * Raw Okta fetch wrapper that returns the Response object directly.
 * Use this when you need to read response headers (e.g. x-total-count).
 */
export async function oktaFetchRaw(
  config: OktaConfig,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const baseUrl = normalizeOrgUrl(config.orgUrl);
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SSWS ${config.apiToken}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  return res;
}
