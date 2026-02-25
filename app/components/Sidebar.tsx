'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import { useOkta } from '../context/OktaContext';
import { automationScripts } from '../../lib/data/automationScripts';
import { ThemeToggle } from './ui/ThemeToggle';

export type ViewType = 'scripts' | 'settings' | 'overview' | 'logs';
export type CategoryType = 'all' | 'Setup & Users' | 'Security & Policies' | 'Applications' | 'Governance' | 'Tools';

interface SidebarProps {
  activeView: ViewType;
  activeCategory: CategoryType;
  onViewChange: (view: ViewType) => void;
  onCategoryChange: (category: CategoryType) => void;
}

// Count scripts per category
function getScriptCount(category: CategoryType): number {
  if (category === 'all') return automationScripts.length;
  return automationScripts.filter((s) => s.category === category).length;
}

// --- SVG Icons ---
function IconOverview() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconSetup() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconSecurity() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconApps() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconGovernance() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function IconTools() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconChevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
      />
    </svg>
  );
}

// Category nav items (scripts view)
const CATEGORY_NAV: { label: CategoryType; icon: () => ReactElement }[] = [
  { label: 'Setup & Users', icon: IconSetup },
  { label: 'Security & Policies', icon: IconSecurity },
  { label: 'Applications', icon: IconApps },
  { label: 'Governance', icon: IconGovernance },
  { label: 'Tools', icon: IconTools },
];

export function Sidebar({ activeView, activeCategory, onViewChange, onCategoryChange }: SidebarProps) {
  const { orgUrl, apiToken } = useOkta();
  const [collapsed, setCollapsed] = useState(false);

  const isConnected = orgUrl.trim() !== '' && apiToken.trim() !== '';

  const handleCategoryClick = (category: CategoryType) => {
    onViewChange('scripts');
    onCategoryChange(category);
  };

  return (
    <aside
      className={`flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-700 dark:bg-slate-900 ${
        collapsed ? 'w-[60px]' : 'w-[220px]'
      }`}
    >
      {/* Logo / title */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-slate-200 dark:border-slate-700">
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            Okta SE Toolkit
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <IconChevron direction={collapsed ? 'right' : 'left'} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {/* Overview */}
        <NavItem
          icon={<IconOverview />}
          label="Overview"
          collapsed={collapsed}
          active={activeView === 'overview'}
          onClick={() => onViewChange('overview')}
        />

        {/* System Logs */}
        <NavItem
          icon={
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
          label="System Logs"
          collapsed={collapsed}
          active={activeView === 'logs'}
          onClick={() => onViewChange('logs')}
        />

        {/* Divider + Scripts label */}
        {!collapsed && (
          <div className="px-2 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Scripts
            </span>
          </div>
        )}
        {collapsed && <div className="my-2 border-t border-slate-200 dark:border-slate-700" />}

        {/* All scripts shortcut */}
        <NavItem
          icon={
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          }
          label="All Scripts"
          count={collapsed ? undefined : automationScripts.length}
          collapsed={collapsed}
          active={activeView === 'scripts' && activeCategory === 'all'}
          onClick={() => handleCategoryClick('all')}
        />

        {/* Per-category nav items */}
        {CATEGORY_NAV.map(({ label, icon: Icon }) => {
          const count = getScriptCount(label);
          if (count === 0) return null;
          return (
            <NavItem
              key={label}
              icon={<Icon />}
              label={label}
              count={collapsed ? undefined : count}
              collapsed={collapsed}
              active={activeView === 'scripts' && activeCategory === label}
              onClick={() => handleCategoryClick(label)}
            />
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-200 px-2 py-3 space-y-1 dark:border-slate-700">
        {/* Settings */}
        <NavItem
          icon={<IconSettings />}
          label="Settings"
          collapsed={collapsed}
          active={activeView === 'settings'}
          onClick={() => onViewChange('settings')}
        />

        {/* Theme toggle + connection status */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-1 pt-1`}>
          <ThemeToggle />
          {!collapsed && (
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
              <span className={isConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                {isConnected ? 'Connected' : 'Not set'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// Reusable nav item
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, count, collapsed, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      <span className={active ? 'text-sky-600 dark:text-sky-400' : ''}>{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{label}</span>
          {count !== undefined && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                active
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {count}
            </span>
          )}
        </>
      )}
    </button>
  );
}
