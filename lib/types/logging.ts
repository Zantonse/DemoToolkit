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
