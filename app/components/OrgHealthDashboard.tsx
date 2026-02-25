'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOkta } from '../context/OktaContext';
import { getOrgHealth } from '../actions/oktaActions';
import { Card, CardHeader, CardContent, Button, Badge, Spinner } from './ui';

// ============================================================================
// Types
// ============================================================================

type Authenticator = {
  name: string;
  key: string;
  status: string;
};

type OrgHealthData = {
  userCount: number;
  appCount: number;
  groupCount: number;
  authenticators: Authenticator[];
  orgUrl: string;
  orgLabel: string;
};

// ============================================================================
// Helpers
// ============================================================================

function authenticatorStatusVariant(status: string): 'success' | 'error' | 'neutral' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'INACTIVE') return 'error';
  return 'neutral';
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ============================================================================
// Skeleton
// ============================================================================

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 animate-pulse">
      <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
      <div className="h-9 w-16 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

// ============================================================================
// Stat Card
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {formatCount(value)}
      </p>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function IconUsers() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconApps() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconGroups() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function IconRefresh({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function OrgHealthDashboard() {
  const { orgUrl, apiToken } = useOkta();
  const [data, setData] = useState<OrgHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const hasCredentials = orgUrl.trim() !== '' && apiToken.trim() !== '';

  const fetchHealth = useCallback(async () => {
    if (!hasCredentials) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getOrgHealth({ orgUrl, apiToken });
      if (result.success && result.data) {
        setData(result.data as OrgHealthData);
        setLastRefreshed(new Date());
      } else {
        setError(result.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [orgUrl, apiToken, hasCredentials]);

  // Auto-fetch on mount if credentials are present
  useEffect(() => {
    if (hasCredentials) {
      fetchHealth();
    }
  }, [fetchHealth, hasCredentials]);

  // ---- No credentials state ----
  if (!hasCredentials) {
    return (
      <div>
        <PageHeader loading={false} onRefresh={fetchHealth} lastRefreshed={null} />
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-center dark:border-slate-700 dark:bg-slate-800">
          <svg className="mx-auto mb-4 h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Credentials not configured</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Go to Settings to enter your Okta org URL and API token.
          </p>
        </div>
      </div>
    );
  }

  // ---- Loading state (initial, no data yet) ----
  if (loading && !data) {
    return (
      <div>
        <PageHeader loading={true} onRefresh={fetchHealth} lastRefreshed={null} />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 animate-pulse">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <div className="h-3.5 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error && !data) {
    return (
      <div>
        <PageHeader loading={loading} onRefresh={fetchHealth} lastRefreshed={null} />
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Failed to load org health</p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Loaded state ----
  return (
    <div>
      <PageHeader loading={loading} onRefresh={fetchHealth} lastRefreshed={lastRefreshed} />

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Users" value={data?.userCount ?? 0} icon={<IconUsers />} />
        <StatCard label="Active Apps" value={data?.appCount ?? 0} icon={<IconApps />} />
        <StatCard label="Groups" value={data?.groupCount ?? 0} icon={<IconGroups />} />
      </div>

      {/* Authenticators */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Authenticators</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {data?.authenticators.length ?? 0} configured
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!data || data.authenticators.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No authenticators found.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.authenticators.map((auth, idx) => (
                  <li key={`${auth.key}-${idx}`} className="flex items-center gap-4 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {auth.name}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-slate-400 dark:text-slate-500">
                      {auth.key}
                    </span>
                    <Badge variant={authenticatorStatusVariant(auth.status)}>
                      {auth.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Org info footer */}
      {data && (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          {data.orgLabel ? `${data.orgLabel} · ` : ''}{data.orgUrl}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Page Header sub-component
// ============================================================================

interface PageHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  lastRefreshed: Date | null;
}

function PageHeader({ loading, onRefresh, lastRefreshed }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Org Health</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          At-a-glance overview of your Okta org.
          {lastRefreshed && (
            <span className="ml-2 text-slate-400 dark:text-slate-500">
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="shrink-0 flex items-center gap-1.5"
      >
        {loading ? <Spinner size="sm" /> : <IconRefresh spinning={false} />}
        Refresh
      </Button>
    </div>
  );
}
