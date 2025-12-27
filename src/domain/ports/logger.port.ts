export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export abstract class LoggerPort {
  abstract trace(message: string, context?: LogContext): void;
  abstract debug(message: string, context?: LogContext): void;
  abstract info(message: string, context?: LogContext): void;
  abstract warn(message: string, context?: LogContext): void;
  abstract error(message: string, context?: LogContext): void;
  abstract log(level: LogLevel, message: string, context?: LogContext): void;
}
