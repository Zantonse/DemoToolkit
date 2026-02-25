# Streaming Log Panel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-time SSE-based streaming execution feedback so users see each step of multi-step scripts as they happen, rendered in a bottom terminal-style panel.

**Architecture:** SSE route handler (`/api/scripts/run`) consumes the script registry, passes a `log` callback to each handler, streams LogEntry JSON back to the client. A `useScriptStream` hook consumes the stream. A `LogPanel` component renders at the bottom of AppShell.

**Tech Stack:** Next.js 16 Route Handlers (SSE), React 19, ReadableStream, Tailwind CSS v4.

**No test framework configured** — verification is `npm run build` + browser testing.

---

## Task 1: Create LogEntry types

**Files:**
- Create: `lib/types/logging.ts`

**Step 1:** Create the logging types file:

```typescript
import type { OktaActionResult } from './okta';

export type LogLevel = 'info' | 'success' | 'error' | 'warn';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: unknown;
  step?: string;
  done?: boolean;
  result?: OktaActionResult;
}

export type LogFn = (entry: Omit<LogEntry, 'timestamp'>) => void;
```

**Step 2:** Run `npm run build`. Expected: PASS.

**Step 3:** Commit: `feat: add LogEntry types for streaming execution`

---

## Task 2: Update script registry to support log callback

**Files:**
- Modify: `lib/scriptRegistry.ts`

**Step 1:** Update the `HandlerFn` type to accept an optional third `log` parameter:

```typescript
import type { LogFn } from './types/logging';

export type HandlerFn = (
  config: OktaConfig,
  inputs?: Record<string, string | string[] | undefined>,
  log?: LogFn
) => Promise<OktaActionResult>;
```

**Step 2:** Update every handler wrapper in the `handlers` map to pass through the `log` parameter. For example:

```typescript
'enable-fido2': (config, _inputs, log) => enableFIDO2(config, log),
'populate-demo-users': (config, _inputs, log) => populateDemoUsers(config, log),
// ... etc for all 21 handlers
```

Handlers that take `inputs` pass all three: `(config, inputs, log) => handler(config, { ...parsed inputs... }, log)`.

**Step 3:** Run `npm run build`. It will fail because the handler functions in oktaActions.ts don't accept `log` yet — that's expected. We'll fix it in Task 3.

**Step 4:** Commit: `refactor: update registry HandlerFn type to include log callback`

---

## Task 3: Add log callback to all handlers in oktaActions.ts

**Files:**
- Modify: `app/actions/oktaActions.ts`

This is the largest task. Each exported handler function gains an optional `log: LogFn = () => {}` parameter and gets log calls at key execution points.

**Step 1:** Add the import at the top of the file:

```typescript
import type { LogFn } from '../../lib/types/logging';
```

**Step 2:** Update each handler function signature to accept `log`. Add basic start/end logging to every handler:

For **simple single-step handlers** (enableFIDO2, addSalesforceSAMLApp, addBoxApp, setupRealms, addNewAdministrator, configureEntityRiskPolicy, runPolicySimulation, createNetworkZone, listNetworkZones, createTrustedOrigin, listTrustedOrigins, createAuthServer, addCustomClaim, addCustomScope, createAccessCertificationCampaign):

```typescript
export async function enableFIDO2(config: OktaConfig, log: LogFn = () => {}): Promise<OktaActionResult> {
  log({ level: 'info', message: 'Checking authenticators...' });
  // ... existing logic ...
  log({ level: 'success', message: 'FIDO2 authenticator activated' });
  return { success: true, message: '...' };
}
```

For **multi-step handlers** (the priority ones):

**populateDemoUsers** — log each user creation in the loop:
```typescript
log({ level: 'info', message: `Creating ${profile.firstName} ${profile.lastName}...`, step: `${i+1}/${profiles.length}` });
```

**createStandardDepartmentGroups** — log each group + rule:
```typescript
log({ level: 'info', message: `Creating group: ${dept}`, step: `${i+1}/${departments.length}` });
```

**createDeviceAssurancePolicies** — log each platform:
```typescript
log({ level: 'info', message: `Creating ${platform.name} policy...`, step: `${i+1}/${platforms.length}` });
```

**setupSodDemo** — log each major step (entitlement creation, value creation, rule creation, bundle creation).

**createEntitlementBundles** — log each bundle creation.

**runAllScripts** — log each script start/finish with separators.

**Step 3:** Run `npm run build`. Expected: PASS (all handlers now accept `log`, registry passes it through).

**Step 4:** Commit: `feat: add streaming log callbacks to all 21 handlers`

---

## Task 4: Create SSE route handler

**Files:**
- Create: `app/api/scripts/run/route.ts`

**Step 1:** Create the SSE route handler:

```typescript
import { type NextRequest } from 'next/server';
import { getHandler, hasHandler } from '../../../../lib/scriptRegistry';
import type { LogEntry, LogFn } from '../../../../lib/types/logging';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { scriptId, config, inputs } = body;

  if (!scriptId || !config?.orgUrl || !config?.apiToken) {
    return new Response(JSON.stringify({ error: 'Missing scriptId or config' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!hasHandler(scriptId)) {
    return new Response(JSON.stringify({ error: `Unknown script: ${scriptId}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const handler = getHandler(scriptId)!;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const log: LogFn = (entry) => {
        const full: LogEntry = { ...entry, timestamp: Date.now() };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(full)}\n\n`));
      };

      try {
        const result = await handler(config, inputs, log);
        log({
          level: result.success ? 'success' : 'error',
          message: result.message,
          done: true,
          result,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log({
          level: 'error',
          message,
          done: true,
          result: { success: false, message },
        });
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

**Step 2:** Run `npm run build`. Expected: PASS. Route should appear as `ƒ /api/scripts/run` in output.

**Step 3:** Commit: `feat: add SSE route handler for streaming script execution`

---

## Task 5: Create useScriptStream hook

**Files:**
- Create: `app/hooks/useScriptStream.ts`

**Step 1:** Create the client-side hook:

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import type { OktaConfig, OktaActionResult } from '../../lib/types/okta';
import type { LogEntry } from '../../lib/types/logging';

interface ScriptStreamState {
  logs: LogEntry[];
  isStreaming: boolean;
  result: OktaActionResult | null;
  scriptId: string | null;
  error: string | null;
}

export function useScriptStream() {
  const [state, setState] = useState<ScriptStreamState>({
    logs: [],
    isStreaming: false,
    result: null,
    scriptId: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (
      scriptId: string,
      config: OktaConfig,
      inputs?: Record<string, string | string[] | undefined>
    ) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState({ logs: [], isStreaming: true, result: null, scriptId, error: null });

      try {
        const response = await fetch('/api/scripts/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptId, config, inputs }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({ error: response.statusText }));
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: errBody.error || 'Request failed',
          }));
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE "data:" lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const entry: LogEntry = JSON.parse(trimmed.slice(6));
              setState((prev) => {
                const newState = { ...prev, logs: [...prev.logs, entry] };
                if (entry.done && entry.result) {
                  newState.result = entry.result;
                  newState.isStreaming = false;
                }
                return newState;
              });
            } catch {
              // Skip malformed lines
            }
          }
        }

        // Stream ended — ensure isStreaming is false
        setState((prev) => ({ ...prev, isStreaming: false }));
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setState((prev) => ({ ...prev, isStreaming: false, error: 'Cancelled' }));
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          setState((prev) => ({ ...prev, isStreaming: false, error: msg }));
        }
      }
    },
    []
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearLogs = useCallback(() => {
    setState({ logs: [], isStreaming: false, result: null, scriptId: null, error: null });
  }, []);

  return { ...state, run, cancel, clearLogs };
}
```

**Step 2:** Run `npm run build`. Expected: PASS.

**Step 3:** Commit: `feat: add useScriptStream hook for consuming SSE log stream`

---

## Task 6: Create LogPanel component

**Files:**
- Create: `app/components/LogPanel.tsx`

**Step 1:** Create the bottom panel component. Key features:
- Dark background (slate-900) with monospace text — always terminal-themed regardless of app theme
- Header: script name, progress, cancel button, collapse/close buttons
- Log area: auto-scrolling, color-coded entries by log level
- Footer: copy-all button, final result summary
- Drag handle at top edge for resizing (stores height in state)
- Accepts `logs`, `isStreaming`, `result`, `scriptId`, `onClose`, `onCancel` as props

The panel should:
- Use `useRef` + `scrollIntoView` for auto-scrolling to latest entry
- Format timestamps as `HH:MM:SS.mmm`
- Show step progress as `[3/15]` badges in sky color
- Show a pulsing dot next to the header when streaming
- Copy button copies all log messages as plain text

**Step 2:** Run `npm run build`. Expected: PASS.

**Step 3:** Commit: `feat: add LogPanel component with terminal-style streaming display`

---

## Task 7: Wire LogPanel into AppShell + ScriptRunner

**Files:**
- Modify: `app/components/AppShell.tsx` — add LogPanel rendering and panel state
- Modify: `app/components/ScriptRunner.tsx` — use `useScriptStream()` for individual script execution, expose panel control callbacks

**Step 1:** In `AppShell.tsx`:
- Add state: `logPanelOpen: boolean`, `logPanelHeight: number` (default 300px)
- Import and render `<LogPanel />` below the `<main>` element
- Pass panel state down to ScriptRunner via props or a shared context
- The main content area should shrink when the panel is open: `style={{ height: logPanelOpen ? \`calc(100% - ${logPanelHeight}px)\` : '100%' }}`

**Step 2:** In `ScriptRunner.tsx`:
- Import `useScriptStream`
- In `handleRunSingle`: instead of calling the handler directly via `getHandler()`, call `streamState.run(scriptId, config, inputs)` which POSTs to the SSE endpoint
- The panel opens automatically when streaming starts
- Keep the existing `handleRunAll` using direct server actions (Run All doesn't stream)
- When stream result arrives, update `scriptResults` and fire the toast

**Step 3:** Run `npm run build`. Expected: PASS.

**Step 4:** Commit: `feat: wire streaming log panel into AppShell and ScriptRunner`

---

## Task 8: Final polish + build verification

**Files:**
- Modify: `app/components/LogPanel.tsx` — responsive adjustments
- Modify: `CLAUDE.md` — document the streaming architecture

**Step 1:** Verify the LogPanel works on mobile (full width, appropriate height).

**Step 2:** Update CLAUDE.md to document:
- The SSE streaming route at `/api/scripts/run`
- The `useScriptStream` hook
- The `LogFn` callback pattern in handlers
- That `runAllScripts` still uses direct server actions (no streaming)

**Step 3:** Run `npm run build` + `npm run lint`. Fix any lint issues.

**Step 4:** Commit: `docs: update CLAUDE.md with streaming log panel architecture`
