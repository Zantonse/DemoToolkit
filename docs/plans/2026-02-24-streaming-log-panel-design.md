# Streaming Log Panel — Updated Design for v2

**Date:** 2026-02-24
**Status:** Approved
**Supersedes:** docs/plans/2026-02-11-streaming-log-panel-design.md

## Problem

Script execution shows only a spinner then a one-line result. Users can't see progress during multi-step scripts (e.g., "Creating user 3/15"), what API calls are being made, or detailed error context.

## Solution

Real-time SSE-based streaming execution feedback in a bottom panel (VS Code terminal style) that opens during script execution and shows each step as it happens.

## Architecture

### SSE Route Handler

`app/api/scripts/run/route.ts` — POST endpoint that receives `{ scriptId, config, inputs }`, imports `getHandler()` from `lib/scriptRegistry.ts`, executes the handler with a `log` callback, and streams `LogEntry` objects back via Server-Sent Events.

```
client POST /api/scripts/run → SSE stream → log entry 1 → log entry 2 → ... → final result
```

The registry already maps ScriptId to handler functions. The SSE route reuses this mapping, passing a `log` callback that enqueues entries to the stream.

### Log Entry Type

```typescript
// lib/types/logging.ts

export type LogLevel = 'info' | 'success' | 'error' | 'warn';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: unknown;
  step?: string;        // e.g. "3/15"
  done?: boolean;       // true on final entry
  result?: OktaActionResult;
}

export type LogFn = (entry: Omit<LogEntry, 'timestamp'>) => void;
```

### Handler Refactoring

Each handler in `oktaActions.ts` gains an optional `log` parameter:

```typescript
export async function populateDemoUsers(
  config: OktaConfig,
  log: LogFn = () => {}
): Promise<OktaActionResult> {
  log({ level: 'info', message: 'Starting demo user creation...' });
  for (let i = 0; i < profiles.length; i++) {
    log({ level: 'info', message: `Creating ${profiles[i].firstName} ${profiles[i].lastName}`, step: `${i+1}/${profiles.length}` });
    // ... API call ...
    log({ level: 'success', message: `Created ${profiles[i].firstName}` });
  }
  return { success: true, message: `Created ${profiles.length} demo users` };
}
```

Default no-op preserves backward compatibility with `runAllScripts` and direct calls.

### Script Registry Update

`lib/scriptRegistry.ts` handler type signature updated:

```typescript
type HandlerFn = (
  config: OktaConfig,
  inputs?: Record<string, string | string[] | undefined>,
  log?: LogFn
) => Promise<OktaActionResult>;
```

### Client Hook

`app/hooks/useScriptStream.ts`:

```typescript
function useScriptStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState<OktaActionResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async (scriptId, config, inputs?) => {
    // POST to /api/scripts/run, read SSE stream, append to logs
    // When entry.done === true, set result and isStreaming = false
  };

  const cancel = () => abortRef.current?.abort();

  return { logs, isStreaming, result, run, cancel, clearLogs };
}
```

### Bottom Panel UI

`app/components/LogPanel.tsx`:

- Fixed at the bottom of the content area inside AppShell
- Dark background (slate-900) with monospace text in both light and dark themes
- Drag handle at top edge for resizing (default ~40% viewport height)
- Header: script name, progress badge, cancel button (while streaming), collapse/close buttons
- Log area: auto-scrolling, color-coded entries (info=gray, success=green, warn=amber, error=red)
- Footer: copy-to-clipboard button, final result summary
- Hidden when no execution has occurred

### Integration Points

- `AppShell.tsx` — manages panel visibility state, renders LogPanel below the content area
- `ScriptRunner.tsx` — calls `useScriptStream().run()` instead of direct server action calls for individual scripts. Keeps direct server action calls for "Run All" (which doesn't need per-step streaming).
- `Toast` — still fires on completion (supplementary to the panel)

## Error Handling

- **Connection loss:** Panel shows "Connection lost" warning. Server continues to completion.
- **Cancellation:** Cancel button aborts the fetch. Server checks signal before each API call.
- **Concurrent execution:** One script at a time (unchanged). All Run buttons disabled during streaming.

## Files

### New
- `app/api/scripts/run/route.ts` — SSE route handler
- `app/hooks/useScriptStream.ts` — Client streaming hook
- `app/components/LogPanel.tsx` — Bottom panel component
- `lib/types/logging.ts` — LogEntry, LogLevel, LogFn types

### Modified
- `app/actions/oktaActions.ts` — Add optional `log: LogFn` param to all handlers, add log calls
- `lib/scriptRegistry.ts` — Update HandlerFn type to include `log` param
- `app/components/AppShell.tsx` — Render LogPanel, manage panel state
- `app/components/ScriptRunner.tsx` — Use `useScriptStream()` for individual script execution

### Unchanged
- `app/actions/helpers/` — SSWS and OAuth helpers
- `lib/data/automationScripts.ts` — Script metadata
- `app/context/` — OktaContext and ThemeContext
- `app/components/ui/` — Shared UI components
- `app/components/Sidebar.tsx` — Navigation

## Handler Log Coverage (which handlers get log calls)

Priority handlers (multi-step, benefit most from streaming):
1. `populateDemoUsers` — Creates 15 users in a loop
2. `createStandardDepartmentGroups` — Creates 7 groups + 7 rules
3. `createDeviceAssurancePolicies` — Creates 4 platform policies
4. `runAllScripts` — Runs 10 scripts sequentially
5. `setupSodDemo` — Multi-step OIG flow (entitlement + values + rule + bundles)

All other handlers get basic start/end log calls even if they're single-step operations.
