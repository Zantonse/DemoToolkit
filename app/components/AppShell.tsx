'use client';

import { useState } from 'react';
import { Sidebar, type ViewType, type CategoryType } from './Sidebar';
import { ScriptRunner } from './ScriptRunner';
import { SettingsPanel } from './SettingsPanel';

export function AppShell() {
  const [activeView, setActiveView] = useState<ViewType>('scripts');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, shown as drawer when mobileNavOpen */}
      <div
        className={`fixed inset-y-0 left-0 z-30 lg:static lg:z-auto lg:flex ${
          mobileNavOpen ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <Sidebar
          activeView={activeView}
          activeCategory={activeCategory}
          onViewChange={(view) => {
            setActiveView(view);
            setMobileNavOpen(false);
          }}
          onCategoryChange={(cat) => {
            setActiveCategory(cat);
            setMobileNavOpen(false);
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden dark:border-slate-700 dark:bg-slate-900">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Open navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Okta SE Toolkit</span>
        </header>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
            <MainContent activeView={activeView} activeCategory={activeCategory} />
          </div>
        </main>
      </div>
    </div>
  );
}

interface MainContentProps {
  activeView: ViewType;
  activeCategory: CategoryType;
}

function MainContent({ activeView, activeCategory }: MainContentProps) {
  if (activeView === 'settings') {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manage the Okta org and API token used by your SE Toolkit.
          </p>
        </div>
        <SettingsPanel />
      </div>
    );
  }

  if (activeView === 'overview') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-xl border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <svg
            className="mx-auto mb-4 h-10 w-10 text-slate-300 dark:text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Org Health Dashboard
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Coming soon — at-a-glance view of your org&apos;s health metrics.
          </p>
        </div>
      </div>
    );
  }

  if (activeView === 'logs') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-xl border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <svg
            className="mx-auto mb-4 h-10 w-10 text-slate-300 dark:text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            System Log Viewer
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Coming soon — browse and filter your Okta system logs.
          </p>
        </div>
      </div>
    );
  }

  // Default: scripts view
  return <ScriptRunner activeCategory={activeCategory} />;
}
