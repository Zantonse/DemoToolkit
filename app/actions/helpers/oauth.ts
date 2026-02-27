/**
 * OAuth 2.0 Utilities for OIG (Okta Identity Governance) APIs
 *
 * These helpers support client_credentials flow with private_key_jwt authentication,
 * which is required for OIG APIs like Entitlements, Risk Rules, and Access Requests.
 */

import { SignJWT, importPKCS8, importJWK } from 'jose';
import { normalizeOrgUrl, safeJson } from './okta-api';

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Generate a client assertion JWT for private_key_jwt authentication
 * Supports both PEM format and JWK (JSON) format private keys
 */
export async function generateClientAssertion(
  clientId: string,
  orgUrl: string,
  privateKeyInput: string,
  keyId: string
): Promise<string> {
  let privateKey;

  // Normalize the input - remove extra whitespace and carriage returns
  let keyData = privateKeyInput.trim().replace(/\r/g, '');

  // Strip PEM headers if present (Okta sometimes wraps JWK in PEM headers incorrectly)
  if (keyData.includes('-----BEGIN')) {
    keyData = keyData
      .replace(/-----BEGIN [A-Z ]+-----/g, '')
      .replace(/-----END [A-Z ]+-----/g, '')
      .trim();
  }

  // Check if it's JSON (JWK format) by looking for opening brace
  const isJwk = keyData.startsWith('{') || keyData.includes('"kty"');

  if (isJwk) {
    // Parse as JWK (JSON Web Key)
    try {
      const jwk = JSON.parse(keyData);
      if (!jwk.kty) {
        throw new Error('JWK missing required "kty" field');
      }
      privateKey = await importJWK(jwk, 'RS256');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to parse private key as JWK: ${message}. Make sure the JSON is valid.`
      );
    }
  } else {
    // Parse as PEM format
    try {
      // Reconstruct PEM with proper formatting
      let pemKey = privateKeyInput.trim();

      if (!pemKey.includes('-----BEGIN')) {
        // Raw base64, wrap in PEM headers
        const chunked = keyData.match(/.{1,64}/g)?.join('\n') || keyData;
        pemKey = `-----BEGIN PRIVATE KEY-----\n${chunked}\n-----END PRIVATE KEY-----`;
      } else {
        // Has headers but might need newline fixing
        pemKey = pemKey.replace(/\r/g, '');
        if (!pemKey.includes('\n')) {
          pemKey = pemKey
            .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
            .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----');
        }
      }

      privateKey = await importPKCS8(pemKey, 'RS256');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to parse private key as PEM: ${message}. For JWK format, paste the JSON directly.`
      );
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const jti = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .setIssuedAt(now)
    .setExpirationTime(now + 300) // 5 minutes
    .setIssuer(clientId)
    .setSubject(clientId)
    .setAudience(`${normalizeOrgUrl(orgUrl)}/oauth2/v1/token`)
    .setJti(jti)
    .sign(privateKey);

  return jwt;
}

/**
 * Get OAuth 2.0 access token using client credentials flow with private_key_jwt
 * Required for OIG APIs (Entitlements, Risk Rules, etc.)
 */
export async function getOAuthAccessToken(
  orgUrl: string,
  clientId: string,
  privateKey: string,
  keyId: string,
  scopes: string[]
): Promise<string> {
  const baseUrl = normalizeOrgUrl(orgUrl);
  const tokenUrl = `${baseUrl}/oauth2/v1/token`;

  // Generate client assertion JWT
  const clientAssertion = await generateClientAssertion(
    clientId,
    orgUrl,
    privateKey,
    keyId
  );

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: scopes.join(' '),
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await safeJson<{ error_description?: string; error?: string }>(
      response
    );
    throw new Error(
      `OAuth token exchange failed (${response.status}): ${
        error?.error_description || error?.error || response.statusText
      }`
    );
  }

  const tokenData = (await response.json()) as OAuthTokenResponse;
  return tokenData.access_token;
}

/**
 * Make authenticated request to OIG API using OAuth Bearer token
 */
export async function oigFetch<T = unknown>(
  baseUrl: string,
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${normalizeOrgUrl(baseUrl)}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await safeJson<{ errorSummary?: string; message?: string }>(
      response
    );
    const method = init?.method || 'GET';
    let helpText = '';

    if (response.status === 403) {
      helpText =
        ' Check that your API Services app has: 1) Okta API Scopes granted (okta.governance.entitlements.manage, okta.governance.riskRule.manage, okta.apps.read), and 2) An admin role assigned (Super Administrator or custom role with OIG permissions).';
    }

    throw new Error(
      `OIG API error on ${method} ${path} (${response.status}): ${
        error?.errorSummary || error?.message || response.statusText
      }${helpText}`
    );
  }

  return response.json();
}
