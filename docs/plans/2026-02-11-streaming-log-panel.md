# Streaming Log Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-time streaming execution feedback to script runs via a slide-out terminal-style log panel.

**Architecture:** SSE (Server-Sent Events) via a Next.js Route Handler streams JSON log entries from server to client. Each script handler gains an optional `log` callback. A new `useScriptStream` hook consumes the stream. A `LogPanel` component renders a dark, auto-scrolling log panel that slides in from the right.

**Tech Stack:** Next.js 16 Route Handlers (ReadableStream), React hooks (useState/useRef/useEffect/useCallback), Tailwind CSS for panel styling. No new dependencies.

**Design doc:** `docs/plans/2026-02-11-streaming-log-panel-design.md`

**Worktree:** `.worktrees/streaming-log-panel/` on branch `feature/streaming-log-panel`

**Note:** This project has no test framework. Steps that would normally be TDD are instead verified via `npx next build` (type checking) and manual browser testing.

---

## Task 1: Create LogEntry types

**Files:**
- Create: `lib/types/logging.ts`

**Step 1: Create the types file**

```typescript
// lib/types/logging.ts
import type { OktaActionResult } from './okta';

export type LogLevel = 'info' | 'success' | 'error' | 'warn';

export type LogFn = (entry: Omit<LogEntry, 'timestamp'>) => void;

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: unknown;
  step?: string;
  done?: boolean;
  result?: OktaActionResult;
}
```

Key types:
- `LogFn` is the callback type that handlers accept. Defined once here so `oktaActions.ts` and the route handler both import the same type.
- `LogEntry` is what the SSE stream sends as JSON.

**Step 2: Verify build**

Run: `npx next build`
Expected: Build passes (no consumers yet, just new types).

**Step 3: Commit**

```bash
git add lib/types/logging.ts
git commit -m "feat: add LogEntry and LogFn types for streaming logs"
```

---

## Task 2: Add `log` callback to script handlers in `oktaActions.ts`

This is the largest task. Every exported handler function gains an optional `log: LogFn = () => {}` parameter. Log calls are added at key execution points: before API calls, after successes, on errors, and with `step` progress in loops.

**Files:**
- Modify: `app/actions/oktaActions.ts`

**Important context for implementer:**
- The file starts with `'use server';` on line 2.
- There are 15 exported handler functions (see line numbers below).
- `runAllScripts` (line 2040) calls other handlers internally — it must pass the `log` callback through.
- `assignSuperAdminRole` (line 317) is called internally by `createSuperAdminsGroup` — it also needs the `log` parameter.
- `updateAdminConsolePolicy` (line 432) is called internally by `createSuperAdminsGroup` — same treatment.
- The `log` parameter must come after all existing parameters and before the closing `)`.
- For handlers with a `params`/`options` object, `log` comes after that parameter.

**Handler signatures to update (line numbers are approximate — verify before editing):**

| Line | Function | Current extra params |
|------|----------|---------------------|
| 71 | `enableFIDO2` | none |
| 176 | `createSuperAdminsGroup` | none |
| 317 | `assignSuperAdminRole` | `groupId: string` |
| 432 | `updateAdminConsolePolicy` | none |
| 734 | `populateDemoUsers` | none |
| 839 | `addSalesforceSAMLApp` | none |
| 922 | `addBoxApp` | none |
| 1010 | `createAccessCertificationCampaign` | none |
| 1209 | `createStandardDepartmentGroups` | none |
| 1351 | `createDeviceAssurancePolicies` | none |
| 1485 | `configureEntityRiskPolicy` | none |
| 1662 | `addNewAdministrator` | `params: { firstName, lastName, email }` |
| 1800 | `setupRealms` | none |
| 1904 | `runPolicySimulation` | `params: { appInstance, policyTypes? }` |
| 2040 | `runAllScripts` | none |
| 2322 | `setupSodDemo` | `params: SetupSodDemoParams` |
| 2513 | `createEntitlementBundles` | `options: { ... }` |

**Step 1: Add import for `LogFn`**

At line 4, add:

```typescript
import type { LogFn } from '../../lib/types/logging';
```

**Step 2: Update each handler signature**

For each handler function, add `log: LogFn = () => {}` as the last parameter. Example patterns:

```typescript
// Config-only handlers (enableFIDO2, populateDemoUsers, etc.):
export async function enableFIDO2(
  config: OktaConfig,
  log: LogFn = () => {}
): Promise<OktaActionResult> {

// Handlers with params (addNewAdministrator, runPolicySimulation, etc.):
export async function addNewAdministrator(
  config: OktaConfig,
  params: { firstName: string; lastName: string; email: string },
  log: LogFn = () => {}
): Promise<OktaActionResult> {

// Internal helpers called by other handlers:
export async function assignSuperAdminRole(
  config: OktaConfig,
  groupId: string,
  log: LogFn = () => {}
): Promise<OktaActionResult> {
```

**Step 3: Add log calls inside each handler**

Follow this pattern for each handler:

1. **Start**: `log({ level: 'info', message: 'Starting [description]...' })` at the beginning of the try block
2. **API call**: `log({ level: 'info', message: 'Calling [endpoint]...' })` before significant fetch calls
3. **Success**: `log({ level: 'success', message: '[What happened]' })` after successful operations
4. **Already-exists**: `log({ level: 'warn', message: '[Thing] already exists, skipping' })` for skip scenarios
5. **Error**: `log({ level: 'error', message: '[What failed]: [error]' })` in catch blocks (before returning)
6. **Loop progress**: `log({ level: 'info', message: '...', step: '3/15' })` inside loops

**Detailed log instrumentation by handler:**

### enableFIDO2 (line 71)
```
log info: "Checking FIDO2/WebAuthn authenticator status..."
log info: "Listing authenticators..." (before fetch)
log warn: "FIDO2 authenticator already active" (if already active)
log info: "Activating FIDO2 authenticator..." (if inactive)
log success: "FIDO2 authenticator activated"
log info: "Creating FIDO2 authenticator..." (if missing)
log success: "FIDO2 authenticator created and enabled"
log error: on catch
```

### createSuperAdminsGroup (line 176)
```
log info: "Creating Super Administrators group..."
log info: "Searching for existing group..."
log warn: "Group already exists" (if found)
log info: "Creating group..." (if not found)
log success: "Group created"
log info: "Assigning SUPER_ADMIN role..."
log success: "Role assigned" / log warn: "Role already assigned"
```
Pass `log` through to `assignSuperAdminRole()` and `updateAdminConsolePolicy()`.

### populateDemoUsers (line 734) — most important for progress
```
log info: "Starting demo user creation..."
Inside loop: log info with step: `${i+1}/${profiles.length}` "Creating user [firstName] [lastName]..."
  log success: "Created [firstName] [lastName]"
  log warn: "Skipped [email] — already exists"
  log error: "Failed to create [email]: [error]"
log info: "Demo user population complete. Created: X, Skipped: Y, Errors: Z"
```

### createStandardDepartmentGroups (line 1209) — has loops
```
log info: "Creating standard department groups..."
For each group: log info with step "Creating group [name]..."
  log success / warn / error per group
For each rule: log info with step "Creating assignment rule for [group]..."
  log success / warn / error per rule
```

### createDeviceAssurancePolicies (line 1351) — has loops
```
log info: "Creating device assurance policies..."
For each platform: log info with step "Creating [platform] policy..."
  log success / warn / error per policy
```

### Other single-operation handlers (addSalesforceSAMLApp, addBoxApp, etc.)
```
log info: "Starting [operation]..."
log info: "[Specific API call]..."
log success/warn/error as appropriate
```

### runAllScripts (line 2040)
Pass `log` to each handler it calls. Add separator-style log entries between scripts:
```
log info: "═══ Running: Enable FIDO2 Authenticator ═══"
// call enableFIDO2(config, log)
log info: "═══ Running: Create Super Administrators Group ═══"
// call createSuperAdminsGroup(config, log)
// ... etc
```

**Step 4: Verify build**

Run: `npx next build`
Expected: Build passes. All existing call sites still work because `log` defaults to no-op.

**Step 5: Commit**

```bash
git add app/actions/oktaActions.ts
git commit -m "feat: add streaming log callback to all script handlers

Each handler now accepts an optional log: LogFn parameter that defaults
to a no-op. Log calls added at key execution points: API calls, results,
errors, and loop progress."
```

---

## Task 3: Create the SSE Route Handler with `executeScript` dispatcher

**Files:**
- Create: `app/api/scripts/run/route.ts`

**Step 1: Create the route handler**

```typescript
// app/api/scripts/run/route.ts
import type { OktaConfig, OktaActionResult } from '../../../../lib/types/okta';
import type { LogEntry, LogFn } from '../../../../lib/types/logging';
import {
  enableFIDO2,
  createSuperAdminsGroup,
  populateDemoUsers,
  createStandardDepartmentGroups,
  createDeviceAssurancePolicies,
  configureEntityRiskPolicy,
  addSalesforceSAMLApp,
  addBoxApp,
  createAccessCertificationCampaign,
  setupRealms,
  addNewAdministrator,
  runPolicySimulation,
  runAllScripts,
  setupSodDemo,
  createEntitlementBundles,
} from '../../../actions/oktaActions';
import type { ScriptId } from '../../../../lib/data/automationScripts';

interface RunRequest {
  scriptId: ScriptId | 'all';
  config: OktaConfig;
  inputs?: Record<string, string | string[]>;
}

async function executeScript(
  scriptId: ScriptId | 'all',
  config: OktaConfig,
  inputs: Record<string, string | string[]> | undefined,
  log: LogFn
): Promise<OktaActionResult> {
  switch (scriptId) {
    case 'enable-fido2':
      return enableFIDO2(config, log);
    case 'create-super-admins-group':
      return createSuperAdminsGroup(config, log);
    case 'populate-demo-users':
      return populateDemoUsers(config, log);
    case 'create-standard-department-groups':
      return createStandardDepartmentGroups(config, log);
    case 'create-device-assurance-policies':
      return createDeviceAssurancePolicies(config, log);
    case 'configure-entity-risk-policy':
      return configureEntityRiskPolicy(config, log);
    case 'add-salesforce-saml-app':
      return addSalesforceSAMLApp(config, log);
    case 'add-box-app':
      return addBoxApp(config, log);
    case 'create-access-certification-campaign':
      return createAccessCertificationCampaign(config, log);
    case 'setup-realms':
      return setupRealms(config, log);
    case 'add-new-administrator':
      return addNewAdministrator(config, {
        firstName: inputs?.firstName as string,
        lastName: inputs?.lastName as string,
        email: inputs?.email as string,
      }, log);
    case 'run-policy-simulation':
      return runPolicySimulation(config, {
        appInstance: inputs?.appInstance as string,
        policyTypes: inputs?.policyTypes as string[] | undefined,
      }, log);
    case 'setup-sod-demo':
      return setupSodDemo(config, {
        appId: inputs?.appId as string,
        entitlementName: inputs?.entitlementName as string | undefined,
        role1Name: inputs?.role1Name as string | undefined,
        role2Name: inputs?.role2Name as string | undefined,
      }, log);
    case 'create-entitlement-bundles':
      return createEntitlementBundles(config, {
        entitlementId: inputs?.entitlementId as string,
        bundle1Name: inputs?.bundle1Name as string,
        bundle1ValueId: inputs?.bundle1ValueId as string,
        bundle2Name: inputs?.bundle2Name as string | undefined,
        bundle2ValueId: inputs?.bundle2ValueId as string | undefined,
      }, log);
    case 'all':
      return runAllScripts(config, log);
    default:
      return { success: false, message: `Unknown script: ${scriptId}` };
  }
}

export async function POST(request: Request) {
  const body: RunRequest = await request.json();
  const { scriptId, config, inputs } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const log: LogFn = (entry) => {
        const full: LogEntry = { ...entry, timestamp: Date.now() };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(full)}\n\n`));
      };

      try {
        const result = await executeScript(scriptId, config, inputs, log);
        const finalEntry: LogEntry = {
          level: result.success ? 'success' : 'error',
          message: result.message,
          timestamp: Date.now(),
          done: true,
          result,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalEntry)}\n\n`));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const finalEntry: LogEntry = {
          level: 'error',
          message,
          timestamp: Date.now(),
          done: true,
          result: { success: false, message },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalEntry)}\n\n`));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

**Important notes for implementer:**
- The route handler does NOT have `'use server'` — it's a Route Handler, not a Server Action.
- The `executeScript` switch mirrors the one in `ScriptRunner.tsx` but passes `log` and lives on the server.
- Inputs come as a flat `Record<string, string | string[]>` matching the `scriptInputs` state shape in `ScriptRunner`.

**Step 2: Verify build**

Run: `npx next build`
Expected: Build passes. The new route appears in the build output as `f /api/scripts/run`.

**Step 3: Commit**

```bash
git add app/api/scripts/run/route.ts
git commit -m "feat: add SSE route handler for streaming script execution

Introduces /api/scripts/run POST endpoint that streams log entries as
Server-Sent Events. Includes executeScript dispatcher that maps script
IDs to handler functions with log callback."
```

---

## Task 4: Create `useScriptStream` hook

**Files:**
- Create: `app/hooks/useScriptStream.ts`

**Step 1: Create the hook**

```typescript
// app/hooks/useScriptStream.ts
'use client';

import { useState, useRef, useCallback } from 'react';
import type { OktaConfig, OktaActionResult } from '../../lib/types/okta';
import type { LogEntry } from '../../lib/types/logging';
import type { ScriptId } from '../../lib/data/automationScripts';

export interface ScriptStreamState {
  logs: LogEntry[];
  isStreaming: boolean;
  result: OktaActionResult | null;
  activeScriptId: ScriptId | 'all' | null;
  error: string | null;
}

export function useScriptStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState<OktaActionResult | null>(null);
  const [activeScriptId, setActiveScriptId] = useState<ScriptId | 'all' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (
    scriptId: ScriptId | 'all',
    config: OktaConfig,
    inputs?: Record<string, string | string[]>
  ) => {
    // Abort any previous stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Reset state
    setLogs([]);
    setResult(null);
    setError(null);
    setIsStreaming(true);
    setActiveScriptId(scriptId);

    try {
      const response = await fetch('/api/scripts/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId, config, inputs }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body — streaming not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const entry: LogEntry = JSON.parse(trimmed.slice(6));
            setLogs((prev) => [...prev, entry]);

            if (entry.done && entry.result) {
              setResult(entry.result);
            }
          } catch {
            // Ignore malformed lines
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled — not an error
        setLogs((prev) => [
          ...prev,
          { level: 'warn', message: 'Cancelled by user.', timestamp: Date.now() },
        ]);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setLogs((prev) => [
          ...prev,
          { level: 'error', message: `Connection error: ${message}`, timestamp: Date.now() },
        ]);
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { logs, isStreaming, result, activeScriptId, error, run, cancel };
}
```

**Key implementation details for implementer:**
- The SSE parsing handles chunked data correctly: chunks may split across `data:` lines, so we buffer incomplete lines.
- `AbortError` from cancellation is handled gracefully (not treated as a bug).
- `useCallback` on `run` and `cancel` prevents unnecessary re-renders of consumers.
- The hook tracks `activeScriptId` so the LogPanel knows which script name to display.

**Step 2: Verify build**

Run: `npx next build`
Expected: Build passes.

**Step 3: Commit**

```bash
git add app/hooks/useScriptStream.ts
git commit -m "feat: add useScriptStream hook for consuming SSE log stream

Client-side hook that fetches /api/scripts/run, reads the SSE stream,
parses log entries, and exposes logs/result/streaming state. Supports
cancellation via AbortController."
```

---

## Task 5: Create LogPanel component

**Files:**
- Create: `app/components/LogPanel.tsx`

**Step 1: Create the component**

```typescript
// app/components/LogPanel.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { LogEntry } from '../../lib/types/logging';
import { automationScripts } from '../../lib/data/automationScripts';
import type { ScriptId } from '../../lib/data/automationScripts';

interface LogPanelProps {
  open: boolean;
  onClose: () => void;
  logs: LogEntry[];
  isStreaming: boolean;
  scriptId: ScriptId | 'all' | null;
  onCancel: () => void;
}

const levelColors: Record<string, string> = {
  info: 'text-slate-400',
  success: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

const levelIcons: Record<string, string> = {
  info: '●',
  success: '✓',
  warn: '⚠',
  error: '✗',
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getScriptName(scriptId: ScriptId | 'all' | null): string {
  if (!scriptId) return '';
  if (scriptId === 'all') return 'Run All Scripts';
  const script = automationScripts.find((s) => s.id === scriptId);
  return script?.name ?? scriptId;
}

export function LogPanel({ open, onClose, logs, isStreaming, scriptId, onCancel }: LogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    const text = logs
      .map((l) => `[${formatTime(l.timestamp)}] ${l.level.toUpperCase()}: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out sm:w-[440px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-mono text-sm font-semibold text-slate-100">
              {getScriptName(scriptId)}
            </h3>
            {isStreaming && (
              <p className="mt-0.5 text-xs text-slate-400">Running...</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded border border-red-500/50 px-2 py-1 font-mono text-xs text-red-400 hover:bg-red-500/10"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close log panel"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Log area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed"
        >
          {logs.length === 0 && isStreaming && (
            <p className="text-slate-500">Waiting for output...</p>
          )}
          {logs.map((entry, i) => (
            <div
              key={i}
              className={`py-0.5 ${levelColors[entry.level] ?? 'text-slate-400'}`}
            >
              <span className="text-slate-600">{formatTime(entry.timestamp)}</span>
              {' '}
              <span>{levelIcons[entry.level] ?? '●'}</span>
              {' '}
              {entry.step && (
                <span className="text-slate-500">[{entry.step}] </span>
              )}
              <span>{entry.message}</span>
            </div>
          ))}
          {isStreaming && (
            <div className="mt-1 py-0.5">
              <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-sky-500" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-700 px-4 py-2">
          <span className="text-xs text-slate-500">
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={logs.length === 0}
            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Copy log
          </button>
        </div>
      </div>
    </>
  );
}
```

**Design notes for implementer:**
- Full width on mobile (`w-full`), 440px on `sm:` and up.
- Backdrop click closes the panel (but doesn't cancel the stream).
- Auto-scroll uses `useEffect` watching `logs` array length.
- Log entries use `key={i}` which is fine since logs are append-only.
- The pulsing dot at the bottom indicates the stream is still active.

**Step 2: Verify build**

Run: `npx next build`
Expected: Build passes.

**Step 3: Commit**

```bash
git add app/components/LogPanel.tsx
git commit -m "feat: add LogPanel slide-out component for streaming logs

Dark terminal-style panel with auto-scroll, color-coded log entries,
cancel button, copy-to-clipboard, and responsive width."
```

---

## Task 6: Integrate streaming into ScriptRunner

This is the final integration task. Replace the direct server action calls in `ScriptRunner.tsx` with the `useScriptStream` hook, and render the `LogPanel`.

**Files:**
- Modify: `app/components/ScriptRunner.tsx`

**Step 1: Update imports**

Remove all server action imports (lines 26-42). Replace with:

```typescript
import { useScriptStream } from '../hooks/useScriptStream';
import { LogPanel } from './LogPanel';
import { automationScripts, type ScriptId } from '../../lib/data/automationScripts';
```

Remove the local `ScriptId` union type (lines 48-62) — now imported from `automationScripts.ts`.

Keep the existing imports: `useState`, `useMemo`, `Link`, `useOkta`, `AutomationScript`, `OktaActionResult`.

**Step 2: Add streaming state and panel state**

Inside `ScriptRunner()`, add:

```typescript
const stream = useScriptStream();
const [logPanelOpen, setLogPanelOpen] = useState(false);
```

**Step 3: Rewrite `handleRunSingle`**

Replace the entire `handleRunSingle` function (the switch/case block). The new version:

```typescript
const handleRunSingle = async (scriptId: ScriptId) => {
  if (!hasCredentials) {
    setGlobalMessage('Please configure your Okta Org URL and API Token before running scripts.');
    return;
  }

  setGlobalMessage(null);
  setRunningScriptId(scriptId);
  setLogPanelOpen(true);

  const config = buildConfig();
  const inputs = scriptInputs[scriptId];

  await stream.run(scriptId, config, inputs);

  // Update card badge from stream result
  if (stream.result) {
    updateScriptResult(scriptId, stream.result);
  }
  setRunningScriptId(null);
};
```

**Important:** The `stream.result` may not be set synchronously after `await stream.run()` returns because React state updates are batched. Instead, use a `useEffect` to sync the stream result to the card badge:

```typescript
// Sync stream result to card badges
useEffect(() => {
  if (stream.result && stream.activeScriptId && stream.activeScriptId !== 'all') {
    updateScriptResult(stream.activeScriptId as ScriptId, stream.result);
    setRunningScriptId(null);
  }
}, [stream.result, stream.activeScriptId]);
```

And simplify `handleRunSingle` to not await the result:

```typescript
const handleRunSingle = async (scriptId: ScriptId) => {
  if (!hasCredentials) {
    setGlobalMessage('Please configure your Okta Org URL and API Token before running scripts.');
    return;
  }

  setGlobalMessage(null);
  setRunningScriptId(scriptId);
  setLogPanelOpen(true);

  const config = buildConfig();
  const inputs = scriptInputs[scriptId];
  stream.run(scriptId, config, inputs);
};
```

**Step 4: Rewrite `handleRunAll`**

```typescript
const handleRunAll = async () => {
  if (!hasCredentials) {
    setGlobalMessage('Please configure your Okta Org URL and API Token before running scripts.');
    return;
  }

  setGlobalMessage(null);
  setRunningScriptId('all');
  setLogPanelOpen(true);

  const config = buildConfig();
  stream.run('all', config);
};
```

Add a useEffect for handling the 'all' result:

```typescript
useEffect(() => {
  if (stream.result && stream.activeScriptId === 'all') {
    setGlobalMessage(stream.result.message);
    // Map individual results to card badges if available
    if (stream.result.data) {
      const data = stream.result.data as Record<string, OktaActionResult>;
      const mapping: Record<string, ScriptId> = {
        enableFIDO2: 'enable-fido2',
        createSuperAdminsGroup: 'create-super-admins-group',
        populateDemoUsers: 'populate-demo-users',
        createStandardDepartmentGroups: 'create-standard-department-groups',
        createDeviceAssurancePolicies: 'create-device-assurance-policies',
        configureEntityRiskPolicy: 'configure-entity-risk-policy',
        addSalesforceSAMLApp: 'add-salesforce-saml-app',
        addBoxApp: 'add-box-app',
        createAccessCertificationCampaign: 'create-access-certification-campaign',
        setupRealms: 'setup-realms',
      };
      const next: Record<string, OktaActionResult> = {};
      for (const [key, id] of Object.entries(mapping)) {
        if (data[key]) next[id] = data[key];
      }
      setScriptResults(next);
    }
    setRunningScriptId(null);
  }
}, [stream.result, stream.activeScriptId]);
```

**Step 5: Update `isScriptRunning`**

The existing logic checks `runningScriptId`. Also incorporate `stream.isStreaming`:

```typescript
const isAnyRunning = runningScriptId !== null || stream.isStreaming;
```

Remove the existing `const isAnyRunning = runningScriptId !== null;` line.

**Step 6: Add LogPanel to the render tree**

At the end of the return JSX (after `</section>`), add:

```tsx
<LogPanel
  open={logPanelOpen}
  onClose={() => setLogPanelOpen(false)}
  logs={stream.logs}
  isStreaming={stream.isStreaming}
  scriptId={stream.activeScriptId}
  onCancel={stream.cancel}
/>
```

Wrap the return in a fragment (`<>...</>`) since we now return two elements.

**Step 7: Verify build**

Run: `npx next build`
Expected: Build passes. Route list includes `f /api/scripts/run`.

**Step 8: Manual verification**

Run: `npm run dev`
Open http://localhost:3000

1. Configure credentials in Settings
2. Click "Run" on any script — log panel should slide in from right
3. Verify log entries appear in real time with color coding
4. Verify card badge updates after completion
5. Click "Run All Scripts" — verify sequential execution with separators
6. Test "Cancel" button during execution
7. Test "Copy log" button
8. Test closing panel via X button and backdrop click

**Step 9: Commit**

```bash
git add app/components/ScriptRunner.tsx
git commit -m "feat: integrate streaming log panel into ScriptRunner

Replace direct server action calls with useScriptStream hook.
Script dispatch moved to SSE route handler. LogPanel slides in
on execution, showing real-time logs. Card badges still update
on completion. Run All streams sequentially with separators."
```

---

## Task 7: Clean up and final verification

**Files:**
- Modify: `app/components/ScriptRunner.tsx` (if needed — remove dead imports/code)

**Step 1: Verify no dead code**

Check that the following are removed from `ScriptRunner.tsx`:
- All direct server action imports (`enableFIDO2`, `createSuperAdminsGroup`, etc.)
- The local `ScriptId` type (now imported)
- The local `ScriptResult` type alias (unused)
- Any remaining references to the old switch/case dispatch

**Step 2: Run lint**

Run: `npm run lint`
Check that no new lint errors are introduced (pre-existing ones are fine).

**Step 3: Run build**

Run: `npx next build`
Expected: Clean build.

**Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "chore: clean up dead code from ScriptRunner refactor"
```

(Skip this commit if no cleanup was needed.)

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | LogEntry/LogFn types | `lib/types/logging.ts` (new) |
| 2 | Add `log` callback to all handlers | `app/actions/oktaActions.ts` (modify) |
| 3 | SSE route handler + dispatcher | `app/api/scripts/run/route.ts` (new) |
| 4 | useScriptStream hook | `app/hooks/useScriptStream.ts` (new) |
| 5 | LogPanel component | `app/components/LogPanel.tsx` (new) |
| 6 | Integrate into ScriptRunner | `app/components/ScriptRunner.tsx` (modify) |
| 7 | Clean up and verify | Various |
