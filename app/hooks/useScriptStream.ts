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

  // Empty dependency array is intentional: run reads only stable refs (abortRef, setState)
  const run = useCallback(
    async (
      scriptId: string,
      config: OktaConfig,
      inputs?: Record<string, string | string[] | undefined>
    ) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ logs: [], isStreaming: true, result: null, scriptId, error: null });

      try {
        const response = await fetch('/api/scripts/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptId, config, inputs }),
          signal: controller.signal,
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

        if (!response.body) {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: 'Response body is not available',
          }));
          return;
        }

        const reader = response.body.getReader();
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
              console.warn('[useScriptStream] Skipping malformed SSE data:', trimmed);
            }
          }
        }

        // Stream ended — ensure isStreaming is false
        setState((prev) => ({ ...prev, isStreaming: false }));
      } catch (err: unknown) {
        // Only set error if this abort was from the user's cancel(), not from a re-run
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (abortRef.current === controller) {
            setState((prev) => ({ ...prev, isStreaming: false, error: 'Cancelled' }));
          }
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
