/**
 * Settings Panel Component
 * 
 * Configuration panel for managing Okta credentials.
 * 
 * Features:
 * - Input fields for Org URL and API Token
 * - Client-side validation
 * - Show/hide token toggle
 * - Test connection button that validates credentials against Okta
 * - Connection status indicator
 * - Save and reset functionality
 * - localStorage persistence (managed by OktaContext)
 * 
 * Security Note:
 * All credentials are stored client-side in localStorage.
 * No server-side persistence occurs.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useOkta } from '../context/OktaContext';

/** Validation errors for form fields */
interface FieldErrors {
  orgUrl?: string;
  apiToken?: string;
  clientId?: string;
  privateKey?: string;
  keyId?: string;
}

/** Status of the connection test */
type TestStatus = 'idle' | 'success' | 'error';

export function SettingsPanel() {
  const {
    orgUrl,
    apiToken,
    authMode,
    clientId,
    privateKey,
    keyId,
    setOrgUrl,
    setApiToken,
    setAuthMode,
    setClientId,
    setPrivateKey,
    setKeyId,
    resetConfig,
    isInitialized,
  } = useOkta();

  const [showToken, setShowToken] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!orgUrl.trim()) {
      newErrors.orgUrl = 'Okta Org URL is required.';
    } else if (!orgUrl.startsWith('https://')) {
      newErrors.orgUrl = 'Org URL must start with https://';
    } else if (!orgUrl.includes('.')) {
      newErrors.orgUrl = 'Org URL must be a valid URL.';
    }

    if (!apiToken.trim()) {
      newErrors.apiToken = 'API Token is required.';
    } else if (apiToken.trim().length < 16) {
      newErrors.apiToken = 'API Token looks too short.';
    }

    // Validate OAuth fields only if OAuth mode is selected
    if (authMode === 'oauth') {
      if (!clientId.trim()) {
        newErrors.clientId = 'Client ID is required for OAuth mode.';
      }
      if (!privateKey.trim()) {
        newErrors.privateKey = 'Private Key is required for OIG APIs.';
      }
      if (!keyId.trim()) {
        newErrors.keyId = 'Key ID is required for OIG APIs.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    const isValid = validate();
    if (!isValid) {
      setStatusMessage('Please fix the errors before saving.');
      return;
    }

    setStatusMessage('Settings saved successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleReset = () => {
    resetConfig();
    setErrors({});
    setStatusMessage('Settings cleared.');
    setTestStatus('idle');
    setTestMessage(null);
    setTestEmail(null);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleTestConnection = async () => {
    const isValid = validate();
    if (!isValid) {
      setTestStatus('error');
      setTestMessage('Please fix the validation errors before testing.');
      setTestEmail(null);
      return;
    }

    try {
      setIsTesting(true);
      setTestStatus('idle');
      setTestMessage(null);
      setTestEmail(null);

      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgUrl,
          apiToken,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setTestStatus('error');
        setTestMessage(
          data?.error ||
            'Failed to connect to Okta. Please verify your org URL and API token.'
        );
        setTestEmail(null);
        return;
      }

      setTestStatus('success');
      setTestMessage('Connection successful.');
      setTestEmail(data?.email ?? null);
    } catch (error) {
      console.error('Test connection error', error);
      setTestStatus('error');
      setTestMessage(
        'Unexpected error while testing the connection. Please try again.'
      );
      setTestEmail(null);
    } finally {
      setIsTesting(false);
    }
  };

  const connectionStatus = useMemo(() => {
    const hasValues = orgUrl.trim() !== '' && apiToken.trim() !== '';
    const hasErrors = Object.keys(errors).length > 0;

    if (!hasValues) {
      return {
        label: 'Not configured',
        badgeClass:
          'bg-slate-100 text-slate-700 border border-slate-200',
      };
    }

    if (hasErrors) {
      return {
        label: 'Invalid configuration',
        badgeClass: 'bg-red-50 text-red-700 border border-red-200',
      };
    }

    if (testStatus === 'success') {
      return {
        label: 'Connected',
        badgeClass:
          'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    }

    return {
      label: 'Ready',
      badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
    };
  }, [orgUrl, apiToken, errors, testStatus]);

  const testStatusClasses =
    testStatus === 'success'
      ? 'text-emerald-700'
      : testStatus === 'error'
      ? 'text-red-600'
      : 'text-slate-500';

  return (
    <section className="max-w-2xl rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Okta Settings
          </h2>
          <p className="text-sm text-slate-500">
            Configure the org and token used by your SE Toolkit automation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${connectionStatus.badgeClass}`}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" />
            {connectionStatus.label}
          </span>

          {/* Back to Home button in top-right */}
          <Link
            href="/"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <div className="space-y-6 px-6 py-5">
        {!isInitialized && (
          <p className="text-xs text-slate-400">
            Loading saved settings…
          </p>
        )}

        {/* Org URL */}
        <div className="space-y-1.5">
          <label
            htmlFor="orgUrl"
            className="block text-sm font-medium text-slate-800"
          >
            Okta Org URL
          </label>
          <input
            id="orgUrl"
            type="url"
            autoComplete="off"
            value={orgUrl}
            onChange={(e) => setOrgUrl(e.target.value)}
            onBlur={validate}
            placeholder="https://your-org.okta.com"
            className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              errors.orgUrl
                ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                : 'border-slate-300 focus:border-sky-500'
            }`}
          />
          {errors.orgUrl && (
            <p className="text-xs text-red-600">{errors.orgUrl}</p>
          )}
          <p className="text-xs text-slate-500">
            Use the base URL of the Okta tenant you use for demos.
          </p>
        </div>

        {/* API Token */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="apiToken"
              className="block text-sm font-medium text-slate-800"
            >
              API Token
            </label>
            <button
              type="button"
              onClick={() => setShowToken((prev) => !prev)}
              className="text-xs font-medium text-sky-700 hover:text-sky-800"
            >
              {showToken ? 'Hide token' : 'Show token'}
            </button>
          </div>
          <div className="relative">
            <input
              id="apiToken"
              type={showToken ? 'text' : 'password'}
              autoComplete="off"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              onBlur={validate}
              placeholder="Paste your Okta API token"
              className={`block w-full rounded-md border px-3 py-2 pr-24 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                errors.apiToken
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                  : 'border-slate-300 focus:border-sky-500'
              }`}
            />
          </div>
          {errors.apiToken && (
            <p className="text-xs text-red-600">{errors.apiToken}</p>
          )}
          <p className="text-xs text-slate-500">
            Stored in your browser&apos;s localStorage; this panel does not log
            or persist the token server-side.
          </p>
        </div>

        {/* OAuth 2.0 Section for OIG APIs */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                OAuth 2.0 Credentials (for OIG APIs)
              </h3>
              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Required for Governance
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Required for Identity Governance scripts (SoD, Entitlements). Create an API Services app with <strong>private_key_jwt</strong> authentication and grant scopes:{' '}
              <code className="text-[10px] bg-slate-200 px-1 rounded">okta.governance.entitlements.manage</code>,{' '}
              <code className="text-[10px] bg-slate-200 px-1 rounded">okta.governance.riskRule.manage</code>
            </p>
          </div>

          {/* OAuth Client ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="clientId"
              className="block text-sm font-medium text-slate-800"
            >
              Client ID
            </label>
            <input
              id="clientId"
              type="text"
              autoComplete="off"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              onBlur={validate}
              placeholder="0oaxxxxxxxxxxxxxxxx"
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                errors.clientId
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                  : 'border-slate-300 focus:border-sky-500'
              }`}
            />
            {errors.clientId && (
              <p className="text-xs text-red-600">{errors.clientId}</p>
            )}
          </div>

          {/* Key ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="keyId"
              className="block text-sm font-medium text-slate-800"
            >
              Key ID (kid)
            </label>
            <input
              id="keyId"
              type="text"
              autoComplete="off"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              onBlur={validate}
              placeholder="Key ID from your public key"
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                errors.keyId
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                  : 'border-slate-300 focus:border-sky-500'
              }`}
            />
            {errors.keyId && (
              <p className="text-xs text-red-600">{errors.keyId}</p>
            )}
            <p className="text-xs text-slate-500">
              Found in the app&apos;s General tab → Public Keys section after adding a key.
            </p>
          </div>

          {/* Private Key */}
          <div className="space-y-1.5">
            <label
              htmlFor="privateKey"
              className="block text-sm font-medium text-slate-800"
            >
              Private Key (PEM format)
            </label>
            <textarea
              id="privateKey"
              rows={5}
              autoComplete="off"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              onBlur={validate}
              placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
              className={`block w-full rounded-md border px-3 py-2 text-xs font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                errors.privateKey
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                  : 'border-slate-300 focus:border-sky-500'
              }`}
            />
            {errors.privateKey && (
              <p className="text-xs text-red-600">{errors.privateKey}</p>
            )}
            <p className="text-xs text-slate-500">
              The private key generated when creating a public key in Okta. Stored locally only.
            </p>
          </div>
        </div>

        {/* Connection test status */}
        {testStatus !== 'idle' && (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs">
            <p className={testStatusClasses}>
              {testMessage}
              {testStatus === 'success' && testEmail && (
                <>
                  {' '}
                  <span className="font-semibold">
                    Connected as {testEmail}
                  </span>
                </>
              )}
            </p>
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
        <div className="text-xs text-slate-500">
          {statusMessage && <span>{statusMessage}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="rounded-md border border-sky-600 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isTesting ? 'Testing…' : 'Test Connection'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            Save Settings
          </button>
        </div>
      </footer>
    </section>
  );
}
