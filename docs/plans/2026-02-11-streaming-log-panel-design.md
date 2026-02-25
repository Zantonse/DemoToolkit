# Streaming Log Panel for Script Execution

## Problem

Script execution currently provides minimal feedback: a spinner on the Run button, then a one-line success/error message. Users cannot see what step a multi-step script is on, what API calls are being made, or detailed error context when something fails.

## Solution

Replace the "fire and forget" execution model with real-time streaming execution feedback via a slide-out terminal-style log panel.

## Architecture

### Streaming Mechanism: Server-Sent Events (SSE)

Move script execution from Next.js Server Actions to an SSE-capable API route handler. The client opens a fetch stream; the server pushes JSON log entries as the script runs.

```
client POST /api/scripts/run → SSE stream → log entry 1 → log entry 2 → ... → final result
```

**Why SSE over alternatives:**
- Polling adds latency and cleanup complexity
- WebSockets are overkill for one-way log streaming
- SSE uses built-in web platform APIs, no extra dependencies, fits naturally into Next.js route handlers

### Log Entry Format

```typescript
// lib/types/logging.ts

type LogLevel = 'info' | 'success' | 'error' | 'warn';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: unknown;              // structured data (API response, created object)
  step?: string;               // progress indicator, e.g. "23/50"
  done?: boolean;              // true on the final entry
  result?: OktaActionResult;   // only present when done === true
}
```

### Script Handler Refactoring

Each handler function in `oktaActions.ts` gains an optional `log` callback parameter that defaults to a no-op. This preserves backward compatibility with `runAllScripts` and any other internal callers.

```typescript
// Before:
export async function populateDemoUsers(config: OktaConfig): Promise<OktaActionResult> {
  // ... silently create 50 users ...
  return { success: true, message: 'Created 50 users' };
}

// After:
export async function populateDemoUsers(
  config: OktaConfig,
  log: (entry: Omit<LogEntry, 'timestamp'>) => void = () => {}
): Promise<OktaActionResult> {
  log({ level: 'info', message: 'Starting demo user creation...' });
  for (let i = 0; i < users.length; i++) {
    log({ level: 'info', message: `Creating ${users[i].firstName} ${users[i].lastName}`, step: `${i+1}/${users.length}` });
    // ... API call ...
    log({ level: 'success', message: `Created ${users[i].firstName} ${users[i].lastName}` });
  }
  return { success: true, message: `Created ${users.length} demo users` };
}
```

### SSE Route Handler

```typescript
// app/api/scripts/run/route.ts

export async function POST(request: Request) {
  const { scriptId, config, inputs } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const log = (entry: Omit<LogEntry, 'timestamp'>) => {
        const full: LogEntry = { ...entry, timestamp: Date.now() };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(full)}\n\n`));
      };

      try {
        const result = await executeScript(scriptId, config, inputs, log);
        log({ level: result.success ? 'success' : 'error', message: result.message, done: true, result });
      } catch (err) {
        log({ level: 'error', message: String(err), done: true, result: { success: false, message: String(err) } });
      }

      controller.close();
    }
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

The `executeScript` function is a server-side router mapping script IDs to handler functions (replacing the switch/case currently in ScriptRunner.tsx).

### Client-Side Streaming Hook

```typescript
// app/hooks/useScriptStream.ts

function useScriptStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState<OktaActionResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async (scriptId: string, config: OktaConfig, inputs?: Record<string, unknown>) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLogs([]);
    setResult(null);
    setIsStreaming(true);

    const response = await fetch('/api/scripts/run', {
      method: 'POST',
      body: JSON.stringify({ scriptId, config, inputs }),
      signal: abortRef.current.signal,
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    // Read chunks, parse SSE "data:" lines, append to logs
    // When entry.done === true, set result and isStreaming = false
  };

  const cancel = () => abortRef.current?.abort();

  return { logs, isStreaming, result, run, cancel };
}
```

## UI Design

### Slide-Out Log Panel (LogPanel.tsx)

- Fixed-position panel on the right side, ~400px wide, full viewport height
- Dark background (slate-900) with monospace text
- Slides in via CSS transition when execution starts
- Overlays on top of content (no layout shift)

**Header:** Script name, close button (X), cancel button (while streaming)

**Log area:** Auto-scrolling, color-coded entries:
- `info` entries in slate/gray
- `success` entries in green
- `warn` entries in amber
- `error` entries in red
- Progress shown via `step` field (e.g., "Creating users [23/50]")

**Footer:** Copy-to-clipboard button for full log text. Final result highlighted with overall status.

**Behavior:**
- Opens automatically when a script starts
- Auto-scrolls to bottom as new entries appear
- Stays open after completion for review
- User closes manually (X button or click outside)
- Clears and starts fresh if a new script is run while open
- On smaller screens, takes full width

### Run All Scripts

"Run All Scripts" streams each script sequentially in the same panel with clear visual separators between scripts.

## Error Handling

- **Connection loss:** Log panel shows "Connection lost" warning. Server script continues to completion. Card badge reflects actual outcome on next load.
- **Cancellation:** Cancel button calls `AbortController.abort()`. Server checks `request.signal.aborted` before each API call and stops early.
- **Long-running scripts:** No timeout. Progress tracked via `step` field. Auto-scroll keeps latest entry visible.
- **Concurrent execution:** One script at a time (unchanged). All other Run buttons disabled during execution.

## Files Changed

### New files
- `app/api/scripts/run/route.ts` -- SSE route handler with script dispatch
- `app/hooks/useScriptStream.ts` -- Client hook for consuming the log stream
- `app/components/LogPanel.tsx` -- Slide-out terminal-style log panel
- `lib/types/logging.ts` -- LogEntry and LogLevel types

### Modified files
- `app/actions/oktaActions.ts` -- Add optional `log` callback to each handler; add log calls at key execution points
- `app/components/ScriptRunner.tsx` -- Replace direct server action calls with `useScriptStream().run()`; remove switch/case dispatch (moved to route handler); render LogPanel; manage panel open/close state

### Unchanged
- `app/actions/helpers/` -- SSWS and OAuth helpers
- `lib/data/automationScripts.ts` -- Script metadata
- `app/context/OktaContext.tsx` -- Credentials management
- Settings page and API routes for test-connection and apps
