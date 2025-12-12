/**
 * Okta Context Provider
 * 
 * Manages global state for Okta credentials (Org URL and API Token).
 * Provides automatic persistence to browser localStorage.
 * 
 * Usage:
 * - Wrap your app with <OktaProvider>
 * - Access credentials with useOkta() hook
 * 
 * Security Note:
 * Credentials are stored client-side only in localStorage.
 * This is suitable for single-user SE deployments but should
 * not be used for production multi-user applications without
 * proper server-side encryption and token management.
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { OktaConfig } from '../../lib/types/okta';

/** localStorage key for Okta Org URL */
const ORG_URL_KEY = 'oktaOrgUrl';
/** localStorage key for API Token */
const API_TOKEN_KEY = 'oktaApiToken';

/**
 * Extended context value with setters and utilities
 */
interface OktaContextValue extends OktaConfig {
  /** Update the Okta Org URL */
  setOrgUrl: (value: string) => void;
  /** Update the API Token */
  setApiToken: (value: string) => void;
  /** Clear all stored credentials */
  resetConfig: () => void;
  /** Whether localStorage has been loaded (prevents hydration issues) */
  isInitialized: boolean;
}

const OktaContext = createContext<OktaContextValue | undefined>(undefined);

/**
 * Provider component that wraps the application
 * 
 * Automatically loads credentials from localStorage on mount and
 * persists changes back to localStorage when values update.
 */
export function OktaProvider({ children }: { children: ReactNode }) {
  const [orgUrl, setOrgUrl] = useState<string>('');
  const [apiToken, setApiToken] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedOrgUrl = window.localStorage.getItem(ORG_URL_KEY) ?? '';
      const storedApiToken = window.localStorage.getItem(API_TOKEN_KEY) ?? '';

      setOrgUrl(storedOrgUrl);
      setApiToken(storedApiToken);
    } catch (error) {
      console.error('Failed to read Okta config from localStorage', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Persist to localStorage when values change
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(ORG_URL_KEY, orgUrl);
      window.localStorage.setItem(API_TOKEN_KEY, apiToken);
    } catch (error) {
      console.error('Failed to write Okta config to localStorage', error);
    }
  }, [orgUrl, apiToken, isInitialized]);

  const resetConfig = () => {
    setOrgUrl('');
    setApiToken('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ORG_URL_KEY);
      window.localStorage.removeItem(API_TOKEN_KEY);
    }
  };

  return (
    <OktaContext.Provider
      value={{
        orgUrl,
        apiToken,
        setOrgUrl,
        setApiToken,
        resetConfig,
        isInitialized,
      }}
    >
      {children}
    </OktaContext.Provider>
  );
}

/**
 * Hook to access Okta credentials and utilities
 * 
 * Must be used within a component wrapped by <OktaProvider>
 * 
 * @returns OktaContextValue with credentials and setter functions
 * @throws Error if used outside of OktaProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { orgUrl, apiToken, setOrgUrl, setApiToken } = useOkta();
 *   // Use credentials...
 * }
 * ```
 */
export function useOkta() {
  const ctx = useContext(OktaContext);
  if (!ctx) {
    throw new Error('useOkta must be used within an OktaProvider');
  }
  return ctx;
}
