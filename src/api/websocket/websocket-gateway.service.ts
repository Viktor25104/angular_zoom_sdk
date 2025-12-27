import { Inject, Injectable, NgZone, signal } from '@angular/core';
import { WsStatus } from '../../runtime/dto/ws-message.dto';
import { CLIENT_ENV, ClientEnv } from '../../infrastructure/config/env';
import { LoggerPort } from '../../domain/ports/logger.port';

type MessageHandler = (raw: string) => void;
type VoidHandler = () => void;

@Injectable({
  providedIn: 'root'
})
export class WebsocketGatewayService {
  readonly status = signal<WsStatus>('connecting');

  private socket?: WebSocket;
  private readonly messageHandlers = new Set<MessageHandler>();
  private readonly openHandlers = new Set<VoidHandler>();
  private readonly closeHandlers = new Set<VoidHandler>();

  constructor(
    private readonly ngZone: NgZone,
    @Inject(CLIENT_ENV) private readonly env: ClientEnv,
    private readonly logger: LoggerPort
  ) {
    this.connect();
  }

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.createSocket();
  }

  send(message: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.logger.warn('ws_send_skipped_socket_closed', {
        readyState: this.socket?.readyState ?? 'no_socket',
        payload: message
      });
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onOpen(handler: VoidHandler): () => void {
    this.openHandlers.add(handler);
    return () => this.openHandlers.delete(handler);
  }

  onClose(handler: VoidHandler): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  private createSocket(): void {
    this.logger.info('ws_connecting', { url: this.env.ws.url });
    try {
      this.socket = new WebSocket(this.env.ws.url);
    } catch (err) {
      this.logger.error('ws_socket_create_failed', {
        message: err instanceof Error ? err.message : 'unknown_error'
      });
      this.status.set('disconnected');
      return;
    }

    this.socket.addEventListener('open', () => {
      this.ngZone.run(() => {
        this.logger.info('ws_connected', { url: this.env.ws.url });
        this.status.set('connected');
        this.notifyHandlers(this.openHandlers);
      });
    });

    this.socket.addEventListener('close', (event) => {
      this.ngZone.run(() => {
        this.logger.warn('ws_disconnected', {
          code: (event as CloseEvent).code,
          reason: (event as CloseEvent).reason,
          wasClean: (event as CloseEvent).wasClean
        });
        this.status.set('disconnected');
        this.notifyHandlers(this.closeHandlers);
      });
    });

    this.socket.addEventListener('error', (event) => {
      this.ngZone.run(() => {
        this.logger.error('ws_error', { event });
        this.status.set('disconnected');
      });
    });

    this.socket.addEventListener('message', (event) => {
      this.ngZone.run(() => {
        if (typeof event.data !== 'string') {
          this.logger.error('ws_invalid_payload_type', { payloadType: typeof event.data });
          return;
        }
        this.messageHandlers.forEach((handler) => handler(event.data as string));
      });
    });
  }

  private notifyHandlers(handlers: Set<VoidHandler>): void {
    handlers.forEach((handler) => {
      try {
        handler();
      } catch (err) {
        this.logger.error('ws_handler_failed', {
          message: err instanceof Error ? err.message : 'unknown_handler_error'
        });
      }
    });
  }
}
