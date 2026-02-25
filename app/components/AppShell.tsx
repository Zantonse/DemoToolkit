'use client';

import { useState } from 'react';
import { Sidebar, type ViewType, type CategoryType } from './Sidebar';
import { ScriptRunner } from './ScriptRunner';
import { SettingsPanel } from './SettingsPanel';
import { OrgHealthDashboard } from './OrgHealthDashboard';
import { SystemLogViewer } from './SystemLogViewer';

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
    return <OrgHealthDashboard />;
  }

  if (activeView === 'logs') {
    return <SystemLogViewer />;
  }

  // Default: scripts view
  return <ScriptRunner activeCategory={activeCategory} />;
}
