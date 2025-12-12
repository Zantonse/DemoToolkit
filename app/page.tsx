/**
 * Home Page - Okta SE Toolkit
 * 
 * Main landing page that displays the ScriptRunner component,
 * allowing users to execute automation scripts against their
 * configured Okta organization.
 * 
 * Users must configure their Okta Org URL and API Token in
 * Settings before running scripts.
 */

import { ScriptRunner } from './components/ScriptRunner';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            Okta SE Toolkit
          </h1>
          <p className="text-sm text-slate-600">
            Run common SE setup and demo automations against your configured Okta org.
          </p>
        </header>

        <ScriptRunner />
      </div>
    </main>
  );
}
