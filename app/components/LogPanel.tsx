'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { LogEntry } from '../../lib/types/logging';
import type { OktaActionResult } from '../../lib/types/okta';
import { automationScripts } from '../../lib/data/automationScripts';

interface LogPanelProps {
  logs: LogEntry[];
  isStreaming: boolean;
  result: OktaActionResult | null;
  scriptId: string | null;
  error: string | null;
  onClose: () => void;
  onCancel: () => void;
}

const PANEL_MIN_HEIGHT = 100;
const PANEL_MAX_HEIGHT = 600;
const PANEL_DEFAULT_HEIGHT = 300;

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

const levelTextColor: Record<string, string> = {
  info: 'text-slate-300',
  success: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

export function LogPanel({
  logs,
  isStreaming,
  result,
  scriptId,
  error,
  onClose,
  onCancel,
}: LogPanelProps) {
  const [panelHeight, setPanelHeight] = useState(PANEL_DEFAULT_HEIGHT);
  const logEndRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(PANEL_DEFAULT_HEIGHT);
  // Store drag handlers in refs so cleanup effect can remove them on unmount
  const dragMoveRef = useRef<((ev: MouseEvent) => void) | null>(null);
  const dragUpRef = useRef<(() => void) | null>(null);

  // Resolve human-readable script name
  const scriptName = scriptId
    ? (automationScripts.find((s) => s.id === scriptId)?.name ?? scriptId)
    : 'Script Output';

  // Count visible (non-done) entries for auto-scroll
  const visibleLogCount = logs.filter((e) => !e.done).length;

  // Auto-scroll to latest visible log entry
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLogCount]);

  // Clean up drag listeners on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (dragMoveRef.current) window.removeEventListener('mousemove', dragMoveRef.current);
      if (dragUpRef.current) window.removeEventListener('mouseup', dragUpRef.current);
    };
  }, []);

  // --- Drag-to-resize logic ---
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;

    // Remove any lingering listeners from a previous drag
    if (dragMoveRef.current) window.removeEventListener('mousemove', dragMoveRef.current);
    if (dragUpRef.current) window.removeEventListener('mouseup', dragUpRef.current);

    const onMouseMove = (ev: MouseEvent) => {
      if (dragStartY.current === null) return;
      const delta = dragStartY.current - ev.clientY;
      const newHeight = Math.min(
        PANEL_MAX_HEIGHT,
        Math.max(PANEL_MIN_HEIGHT, dragStartHeight.current + delta)
      );
      setPanelHeight(newHeight);
    };

    const onMouseUp = () => {
      dragStartY.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dragMoveRef.current = null;
      dragUpRef.current = null;
    };

    dragMoveRef.current = onMouseMove;
    dragUpRef.current = onMouseUp;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [panelHeight]);

  const handleCopyAll = useCallback(() => {
    const text = logs
      .filter((entry) => !entry.done)
      .map((entry) => {
        const ts = formatTimestamp(entry.timestamp);
        const step = entry.step ? `[${entry.step}] ` : '';
        return `${ts} ${step}${entry.message}`;
      })
      .join('\n');
    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard write can fail in non-secure contexts; acceptable to ignore
    });
  }, [logs]);

  return (
    <div
      className="flex flex-col border-t border-slate-700 bg-slate-900 font-mono"
      style={{ height: panelHeight, minHeight: PANEL_MIN_HEIGHT, maxHeight: PANEL_MAX_HEIGHT }}
    >
      {/* Drag handle — sits at the very top edge */}
      <div
        className="h-1.5 w-full cursor-row-resize bg-slate-700 hover:bg-sky-600 transition-colors"
        onMouseDown={handleDragStart}
        title="Drag to resize"
      />

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {/* Status dot */}
          {isStreaming ? (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-600" />
          )}

          <span className="truncate text-xs font-semibold text-slate-200">
            {scriptName}
          </span>

          {isStreaming && (
            <span className="text-xs text-slate-400 shrink-0">— running</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Cancel button — only visible while streaming */}
          {isStreaming && (
            <button
              onClick={onCancel}
              className="rounded px-2 py-0.5 text-xs font-medium text-red-400 border border-red-700 hover:bg-red-900 hover:text-red-300 transition-colors"
              aria-label="Cancel script execution"
            >
              Cancel
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            title="Close log panel"
            aria-label="Close log panel"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Log output area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 text-xs">
        {logs.length === 0 && !error && !result && (
          <p className="text-slate-500 italic">Waiting for output…</p>
        )}

        {logs
          .filter((entry) => !entry.done)
          .map((entry, idx) => {
            const colorClass = levelTextColor[entry.level] ?? 'text-slate-300';
            return (
              <div key={`${entry.timestamp}-${idx}`} className="flex gap-2 leading-5">
                {/* Timestamp */}
                <span className="shrink-0 text-slate-500 select-none">
                  {formatTimestamp(entry.timestamp)}
                </span>

                {/* Step badge */}
                {entry.step && (
                  <span className="shrink-0 text-sky-400 select-none">
                    [{entry.step}]
                  </span>
                )}

                {/* Message */}
                <span className={colorClass}>{entry.message}</span>
              </div>
            );
          })}

        {/* Auto-scroll target */}
        <div ref={logEndRef} />
      </div>

      {/* Footer — copy-all button, error display, result summary */}
      <div className="shrink-0 border-t border-slate-700 px-3 py-1.5 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {!isStreaming && error && !result && (
            <p className="text-xs text-red-400 truncate">
              <span className="font-semibold">Error:</span> {error}
            </p>
          )}
          {!isStreaming && result && (
            <p className={`text-xs font-medium truncate ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.success ? 'Done: ' : 'Failed: '}
              {result.message}
            </p>
          )}
        </div>
        <button
          onClick={handleCopyAll}
          className="shrink-0 flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
          title="Copy all logs to clipboard"
          aria-label="Copy log output"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </button>
      </div>
    </div>
  );
}
