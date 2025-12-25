import { Injectable } from '@angular/core';

type ConsoleMethod = 'log' | 'error' | 'warn' | 'info';

export interface ConsoleLogEntry {
  timestamp: string;
  level: ConsoleMethod;
  message: unknown[];
}

@Injectable({
  providedIn: 'root'
})
export class ConsoleBufferService {
  private readonly buffer: ConsoleLogEntry[] = [];
  private readonly maxEntries = 500;

  constructor() {
    this.patchConsole('log');
    this.patchConsole('error');
    this.patchConsole('warn');
    this.patchConsole('info');
  }

  getLogs(): ConsoleLogEntry[] {
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
