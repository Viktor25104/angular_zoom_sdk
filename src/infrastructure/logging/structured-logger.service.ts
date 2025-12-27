import { Inject, Injectable } from '@angular/core';
import { LogContext, LogLevel, LoggerPort } from '../../domain/ports/logger.port';
import { CLIENT_ENV, ClientEnv } from '../config/env';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50
};

@Injectable({
  providedIn: 'root'
})
export class StructuredLoggerService implements LoggerPort {
  constructor(@Inject(CLIENT_ENV) private readonly env: ClientEnv) {}

  trace(message: string, context?: LogContext): void {
    this.log('trace', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }
    const line = `[${new Date().toISOString()}][${level.toUpperCase()}] ${message}`;
    const payload = context ? { ...context } : undefined;
    switch (level) {
      case 'trace':
      case 'debug':
        console.debug(line, payload);
        break;
      case 'info':
        console.info(line, payload);
        break;
      case 'warn':
        console.warn(line, payload);
        break;
      case 'error':
        console.error(line, payload);
        break;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const configured = this.env.logging.level || 'info';
    return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[configured];
  }
}
