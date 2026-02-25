'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useOkta } from '../context/OktaContext';
import { getSystemLogs } from '../actions/oktaActions';
import type { LogEvent } from '../actions/oktaActions';
import { Card, Button, Badge, Spinner, SearchInput } from './ui';

// ============================================================================
// Constants
// ============================================================================

const commonEventTypes = [
  { value: '', label: 'All Events' },
  { value: 'user.session.start', label: 'User Session Start' },
  { value: 'user.authentication.sso', label: 'SSO Authentication' },
  { value: 'user.lifecycle.create', label: 'User Created' },
  { value: 'user.lifecycle.activate', label: 'User Activated' },
  { value: 'user.lifecycle.deactivate', label: 'User Deactivated' },
  { value: 'user.account.lock', label: 'Account Locked' },
  { value: 'user.mfa.factor.activate', label: 'MFA Factor Activated' },
  { value: 'application.user_membership.add', label: 'App Assignment Added' },
  { value: 'application.user_membership.remove', label: 'App Assignment Removed' },
  { value: 'group.user_membership.add', label: 'Group Membership Added' },
  { value: 'policy.evaluate_sign_on', label: 'Sign-On Policy Evaluated' },
];

const TIME_RANGES = [
  { label: 'Last 1 hour', hours: 1 },
  { label: 'Last 24 hours', hours: 24 },
  { label: 'Last 7 days', hours: 24 * 7 },
];

const AUTO_REFRESH_INTERVAL_MS = 5_000;

// ============================================================================
// Severity helpers
// ============================================================================

type SeverityVariant = 'neutral' | 'info' | 'warning' | 'error';

function severityVariant(severity: string): SeverityVariant {
  switch (severity.toUpperCase()) {
    case 'DEBUG': return 'neutral';
    case 'INFO': return 'info';
    case 'WARN': return 'warning';
    case 'ERROR': return 'error';
    default: return 'neutral';
  }
}

function severityDot(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'DEBUG': return 'bg-slate-400 dark:bg-slate-500';
    case 'INFO': return 'bg-sky-500 dark:bg-sky-400';
    case 'WARN': return 'bg-amber-500 dark:bg-amber-400';
    case 'ERROR': return 'bg-red-500 dark:bg-red-400';
    default: return 'bg-slate-400 dark:bg-slate-500';
  }
}

// ============================================================================
// Format helpers
// ============================================================================

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ============================================================================
// Log Entry Row
// ============================================================================

interface LogEntryProps {
  event: LogEvent;
}

function LogEntry({ event }: LogEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(event.raw, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable
    }
  };

  return (
    <li className="border-b border-slate-100 last:border-0 dark:border-slate-700">
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        {/* Severity dot */}
        <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${severityDot(event.severity)}`} />

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
              {formatTimestamp(event.published)}
            </span>
            <Badge variant={severityVariant(event.severity)} className="shrink-0">
              {event.severity}
            </Badge>
            <span className="font-mono text-xs text-sky-700 dark:text-sky-400 truncate">
              {event.eventType}
            </span>
          </div>
          <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
            {event.displayMessage}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            {event.actor.displayName && (
              <span>{event.actor.displayName}</span>
            )}
            {event.actor.alternateId && event.actor.alternateId !== event.actor.displayName && (
              <span className="font-mono">{event.actor.alternateId}</span>
            )}
            {event.client.ipAddress && (
              <span className="font-mono">{event.client.ipAddress}</span>
            )}
            {event.outcome.result && (
              <span
                className={
                  event.outcome.result === 'SUCCESS'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : event.outcome.result === 'FAILURE'
                    ? 'text-red-600 dark:text-red-400'
                    : ''
                }
              >
                {event.outcome.result}
                {event.outcome.reason ? ` — ${event.outcome.reason}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Expanded JSON */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Raw Event</span>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {JSON.stringify(event.raw, null, 2)}
          </pre>
        </div>
      )}
    </li>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SystemLogViewer() {
  const { orgUrl, apiToken } = useOkta();

  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [keyword, setKeyword] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [timeRangeHours, setTimeRangeHours] = useState(1);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasCredentials = orgUrl.trim() !== '' && apiToken.trim() !== '';

  // Build the "since" ISO string from selected time range
  const sinceIso = useMemo(() => {
    return new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString();
  }, [timeRangeHours]);

  // Memoize the SCIM filter string
  const filterString = useMemo(() => {
    return eventTypeFilter ? `eventType eq "${eventTypeFilter}"` : undefined;
  }, [eventTypeFilter]);

  const fetchLogs = useCallback(async () => {
    if (!hasCredentials) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getSystemLogs(
        { orgUrl, apiToken },
        { since: sinceIso, filter: filterString, keyword: keyword || undefined, limit: 50 }
      );
      if (result.success && result.data) {
        setEvents((result.data as { events: LogEvent[] }).events);
      } else {
        setError(result.message);
        setEvents([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [orgUrl, apiToken, hasCredentials, sinceIso, filterString, keyword]);

  // Auto-fetch on mount
  useEffect(() => {
    if (hasCredentials) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCredentials]);

  // Refetch when filters change (debounce not needed since we have a manual Refresh button,
  // but we do want to re-run on dropdown changes)
  useEffect(() => {
    if (hasCredentials && !loading) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTypeFilter, timeRangeHours]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh && hasCredentials) {
      intervalRef.current = setInterval(() => {
        fetchLogs();
      }, AUTO_REFRESH_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, hasCredentials, fetchLogs]);

  // ---- No credentials ----
  if (!hasCredentials) {
    return (
      <div>
        <LogPageHeader
          loading={false}
          autoRefresh={false}
          keyword={keyword}
          eventTypeFilter={eventTypeFilter}
          timeRangeHours={timeRangeHours}
          onKeywordChange={setKeyword}
          onEventTypeChange={setEventTypeFilter}
          onTimeRangeChange={setTimeRangeHours}
          onToggleAutoRefresh={() => {}}
          onRefresh={() => {}}
        />
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

  // ---- Main render ----
  return (
    <div>
      <LogPageHeader
        loading={loading}
        autoRefresh={autoRefresh}
        keyword={keyword}
        eventTypeFilter={eventTypeFilter}
        timeRangeHours={timeRangeHours}
        onKeywordChange={setKeyword}
        onEventTypeChange={setEventTypeFilter}
        onTimeRangeChange={setTimeRangeHours}
        onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
        onRefresh={fetchLogs}
      />

      <div className="mt-5">
        {/* Error banner (non-blocking if we have existing data) */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <Card>
          {/* Card header with count + loading indicator */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {loading && events.length === 0 ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Loading events&hellip;
                </span>
              ) : (
                <>
                  {events.length} event{events.length === 1 ? '' : 's'}
                  {loading && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <Spinner size="sm" />
                      Refreshing
                    </span>
                  )}
                </>
              )}
            </span>
            {autoRefresh && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
                Auto-refresh on
              </span>
            )}
          </div>

          {/* Events list */}
          {events.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm text-slate-500 dark:text-slate-400">No log events found for the selected filters.</p>
            </div>
          ) : (
            <ul>
              {events.map((event) => (
                <LogEntry key={event.uuid || `${event.published}-${event.eventType}`} event={event} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Page Header / Toolbar
// ============================================================================

interface LogPageHeaderProps {
  loading: boolean;
  autoRefresh: boolean;
  keyword: string;
  eventTypeFilter: string;
  timeRangeHours: number;
  onKeywordChange: (v: string) => void;
  onEventTypeChange: (v: string) => void;
  onTimeRangeChange: (v: number) => void;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
}

function LogPageHeader({
  loading,
  autoRefresh,
  keyword,
  eventTypeFilter,
  timeRangeHours,
  onKeywordChange,
  onEventTypeChange,
  onTimeRangeChange,
  onToggleAutoRefresh,
  onRefresh,
}: LogPageHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">System Logs</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Browse and filter your Okta org system logs.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Auto-refresh toggle */}
          <button
            type="button"
            onClick={onToggleAutoRefresh}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              autoRefresh
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            Auto-refresh
          </button>

          {/* Manual refresh */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            {loading ? <Spinner size="sm" /> : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Keyword search */}
        <SearchInput
          value={keyword}
          onChange={onKeywordChange}
          placeholder="Search messages..."
          className="w-56"
        />

        {/* Event type filter */}
        <select
          value={eventTypeFilter}
          onChange={(e) => onEventTypeChange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-400"
        >
          {commonEventTypes.map((et) => (
            <option key={et.value} value={et.value}>{et.label}</option>
          ))}
        </select>

        {/* Time range selector */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-slate-900">
          {TIME_RANGES.map((range) => (
            <button
              key={range.hours}
              type="button"
              onClick={() => onTimeRangeChange(range.hours)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                timeRangeHours === range.hours
                  ? 'bg-sky-600 text-white dark:bg-sky-500'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
