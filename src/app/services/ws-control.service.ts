import { Injectable, NgZone, signal } from '@angular/core';

type WsStatus = 'connecting' | 'connected' | 'disconnected';

@Injectable({
  providedIn: 'root'
})
export class WsControlService {
  /**
   * Current WebSocket connection status exposed to the component template.
   */
  readonly status = signal<WsStatus>('connecting');

  private socket?: WebSocket;
  private readonly wsUrl = 'ws://localhost:8081';

  constructor(private readonly ngZone: NgZone) {
    this.openSocket();
  }

  private openSocket(): void {
    try {
      this.socket = new WebSocket(this.wsUrl);
    } catch (err) {
      console.error('[WS] failed to create WebSocket instance', err);
      this.setStatus('disconnected');
      return;
    }

    this.socket.addEventListener('open', () => {
      this.ngZone.run(() => {
        console.log('[WS] CONNECTED');
        this.setStatus('connected');
        this.sendHello();
      });
    });

    this.socket.addEventListener('close', () => {
      this.ngZone.run(() => {
        console.log('[WS] DISCONNECTED');
        this.setStatus('disconnected');
      });
    });

    this.socket.addEventListener('error', (event) => {
      this.ngZone.run(() => {
        console.error('[WS] ERROR', event);
        this.setStatus('disconnected');
      });
    });

    this.socket.addEventListener('message', (event) => {
      this.ngZone.run(() => {
        console.log('[WS] MESSAGE RECEIVED');
        console.log('WS COMMAND:', event.data);
      });
    });
  }

  private sendHello(): void {
    const payload = JSON.stringify({ type: 'HELLO_FROM_ANGULAR' });
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
    }
  }

  private setStatus(status: WsStatus): void {
    this.status.set(status);
  }
}
