import { Injectable } from '@angular/core';
import { LogBufferPort, LogEntry } from '../../domain/ports/log-buffer.port';
type ConsoleMethod = 'log' | 'error' | 'warn' | 'info';

/**
 * Buffers console output so websocket diagnostics can be retrieved via API commands.
 * The service monkey patches the standard console methods once on construction.
 */
@Injectable({
  providedIn: 'root'
})
export class ConsoleBufferService extends LogBufferPort {
  private readonly buffer: LogEntry[] = [];
  private readonly maxEntries = 500;

  constructor() {
    super();
    this.patchConsole('log');
    this.patchConsole('error');
    this.patchConsole('warn');
    this.patchConsole('info');
  }

  override getLogs(): LogEntry[] {
    return [...this.buffer];
  }

  private patchConsole(method: ConsoleMethod): void {
    const original = console[method].bind(console);

    console[method] = (...args: unknown[]) => {
      this.record(method, args);
      original(...args);
    };
  }

  private record(level: ConsoleMethod, args: unknown[]): void {
    this.buffer.push({
      timestamp: new Date().toISOString(),
      level,
      message: args
    });
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift();
    }
  }
}
