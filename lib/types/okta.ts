/**
 * Okta Type Definitions
 * 
 * Core TypeScript interfaces for Okta configuration and API responses.
 */

/**
 * Configuration object for Okta API connections
 */
export interface OktaConfig {
  /** The base URL of the Okta organization (e.g., https://your-org.okta.com) */
  orgUrl: string;
  /** The API token used for authentication with Okta Management API (SSWS mode) */
  apiToken: string;
  /** Authentication mode: 'ssws' for API token, 'oauth' for OAuth 2.0 client credentials */
  authMode?: 'ssws' | 'oauth';
  /** OAuth 2.0 Client ID (for OIG APIs that require OAuth scopes) */
  clientId?: string;
  /** OAuth 2.0 Client Secret (for client_secret_basic auth - not supported by Org AS) */
  clientSecret?: string;
  /** PEM-encoded private key for private_key_jwt authentication (required for OIG APIs) */
  privateKey?: string;
  /** Key ID (kid) for the private key */
  keyId?: string;
}

/**
 * Standard result object returned by all Okta automation actions
 * 
 * @template T - Type of the optional data payload
 */
export interface OktaActionResult<T = any> {
  /** Whether the operation completed successfully */
  success: boolean;
  /** Human-readable message describing the result */
  message: string;
  /** Optional data payload returned from the operation */
  data?: T;
}

