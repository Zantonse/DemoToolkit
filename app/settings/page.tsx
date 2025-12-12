/**
 * Settings Page - Okta SE Toolkit
 * 
 * Configuration page where users can:
 * - Enter and save their Okta Org URL
 * - Enter and save their API Token
 * - Test connection to verify credentials
 * - View connection status
 * - Clear saved credentials
 * 
 * All credentials are stored in browser localStorage (client-side only).
 */

import { SettingsPanel } from '../components/SettingsPanel';

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            Settings
          </h1>
          <p className="text-sm text-slate-600">
            Manage the Okta org and API token used by your SE Toolkit.
          </p>
        </header>

        <SettingsPanel />
      </div>
    </main>
  );
}
