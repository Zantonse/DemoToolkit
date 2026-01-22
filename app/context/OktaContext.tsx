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
/** localStorage key for Auth Mode */
const AUTH_MODE_KEY = 'oktaAuthMode';
/** localStorage key for OAuth Client ID */
const CLIENT_ID_KEY = 'oktaClientId';
/** localStorage key for OAuth Client Secret */
const CLIENT_SECRET_KEY = 'oktaClientSecret';
/** localStorage key for Private Key */
const PRIVATE_KEY_KEY = 'oktaPrivateKey';
/** localStorage key for Key ID */
const KEY_ID_KEY = 'oktaKeyId';

/**
 * Extended context value with setters and utilities
 */
interface OktaContextValue extends OktaConfig {
  /** Update the Okta Org URL */
  setOrgUrl: (value: string) => void;
  /** Update the API Token */
  setApiToken: (value: string) => void;
  /** Update the authentication mode */
  setAuthMode: (value: 'ssws' | 'oauth') => void;
  /** Update the OAuth Client ID */
  setClientId: (value: string) => void;
  /** Update the OAuth Client Secret */
  setClientSecret: (value: string) => void;
  /** Update the Private Key */
  setPrivateKey: (value: string) => void;
  /** Update the Key ID */
  setKeyId: (value: string) => void;
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
  const [authMode, setAuthMode] = useState<'ssws' | 'oauth'>('ssws');
  const [clientId, setClientId] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [keyId, setKeyId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedOrgUrl = window.localStorage.getItem(ORG_URL_KEY) ?? '';
      const storedApiToken = window.localStorage.getItem(API_TOKEN_KEY) ?? '';
      const storedAuthMode = (window.localStorage.getItem(AUTH_MODE_KEY) as 'ssws' | 'oauth') ?? 'ssws';
      const storedClientId = window.localStorage.getItem(CLIENT_ID_KEY) ?? '';
      const storedClientSecret = window.localStorage.getItem(CLIENT_SECRET_KEY) ?? '';
      const storedPrivateKey = window.localStorage.getItem(PRIVATE_KEY_KEY) ?? '';
      const storedKeyId = window.localStorage.getItem(KEY_ID_KEY) ?? '';

      setOrgUrl(storedOrgUrl);
      setApiToken(storedApiToken);
      setAuthMode(storedAuthMode || 'ssws');
      setClientId(storedClientId);
      setClientSecret(storedClientSecret);
      setPrivateKey(storedPrivateKey);
      setKeyId(storedKeyId);
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
      window.localStorage.setItem(AUTH_MODE_KEY, authMode);
      window.localStorage.setItem(CLIENT_ID_KEY, clientId);
      window.localStorage.setItem(CLIENT_SECRET_KEY, clientSecret);
      window.localStorage.setItem(PRIVATE_KEY_KEY, privateKey);
      window.localStorage.setItem(KEY_ID_KEY, keyId);
    } catch (error) {
      console.error('Failed to write Okta config to localStorage', error);
    }
  }, [orgUrl, apiToken, authMode, clientId, clientSecret, privateKey, keyId, isInitialized]);

  const resetConfig = () => {
    setOrgUrl('');
    setApiToken('');
    setAuthMode('ssws');
    setClientId('');
    setClientSecret('');
    setPrivateKey('');
    setKeyId('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ORG_URL_KEY);
      window.localStorage.removeItem(API_TOKEN_KEY);
      window.localStorage.removeItem(AUTH_MODE_KEY);
      window.localStorage.removeItem(CLIENT_ID_KEY);
      window.localStorage.removeItem(CLIENT_SECRET_KEY);
      window.localStorage.removeItem(PRIVATE_KEY_KEY);
      window.localStorage.removeItem(KEY_ID_KEY);
    }
  };

  return (
    <OktaContext.Provider
      value={{
        orgUrl,
        apiToken,
        authMode,
        clientId,
        clientSecret,
        privateKey,
        keyId,
        setOrgUrl,
        setApiToken,
        setAuthMode,
        setClientId,
        setClientSecret,
        setPrivateKey,
        setKeyId,
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
