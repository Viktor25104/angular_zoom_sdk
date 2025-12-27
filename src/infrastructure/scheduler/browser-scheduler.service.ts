import { Injectable } from '@angular/core';
import { SchedulerPort } from '../../domain/ports/scheduler.port';

@Injectable({
  providedIn: 'root'
})
export class BrowserSchedulerService extends SchedulerPort {
  override setTimeout(handler: () => void, timeout: number): number {
    return window.setTimeout(handler, timeout);
  }

  override clearTimeout(handle: number): void {
    window.clearTimeout(handle);
  }
}
