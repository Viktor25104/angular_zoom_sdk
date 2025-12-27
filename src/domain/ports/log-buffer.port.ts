export interface LogEntry {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info';
  message: unknown[];
}

export abstract class LogBufferPort {
  abstract getLogs(): LogEntry[];
}
