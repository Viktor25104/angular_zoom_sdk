import { Injectable } from '@angular/core';

type ConsoleMethod = 'log' | 'error' | 'warn' | 'info';

@Injectable({
  providedIn: 'root'
})
export class ConsoleBufferService {
  private readonly buffer: string[] = [];
  private readonly maxEntries = 500;

  constructor() {
    this.patchConsole('log');
    this.patchConsole('error');
    this.patchConsole('warn');
    this.patchConsole('info');
  }

  getLogs(): string {
    return this.buffer.join('\n');
  }

  private patchConsole(method: ConsoleMethod): void {
    const original = console[method].bind(console);

    console[method] = (...args: unknown[]) => {
      this.record(method, args);
      original(...args);
    };
  }

  private record(level: string, args: unknown[]): void {
    const formatted = args.map((arg) => this.stringify(arg)).join(' ');
    this.buffer.push(`[${new Date().toISOString()}][${level.toUpperCase()}] ${formatted}`);
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift();
    }
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
