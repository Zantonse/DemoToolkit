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
  /** The API token used for authentication with Okta Management API */
  apiToken: string;
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

