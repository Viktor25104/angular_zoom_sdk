import { Injectable, NgZone, signal } from '@angular/core';
import { ZoomMtg } from '@zoom/meetingsdk';
import { ConsoleBufferService, ConsoleLogEntry } from './console-buffer.service';

type WsStatus = 'connecting' | 'connected' | 'disconnected';

interface ZoomInitPayload {
  sdkKey: string;
  signature: string;
  meetingNumber: string;
  passWord: string;
  userName: string;
  userEmail?: string;
  tk?: string;
  zak?: string;
}

interface WsCommand<T = unknown> {
  type: string;
  payload?: T;
}

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
  private zoomConfig?: ZoomInitPayload;
  private zoomInitialized = false;
  private zoomInitializing = false;
  private initTimeoutHandle: number | null = null;

  constructor(
    private readonly ngZone: NgZone,
    private readonly consoleBuffer: ConsoleBufferService
  ) {
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
        const command = this.parseCommand(event.data);
        if (!command) {
          return;
        }
        console.log('WS COMMAND:', command);
        this.routeCommand(command);
      });
    });
  }

  private sendHello(): void {
    const payload = JSON.stringify({ type: 'HELLO_FROM_ANGULAR' });
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
    }
  }

  private sendMessage(message: Record<string, unknown>): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('[WS] cannot send message, socket not open', message);
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  private parseCommand(raw: unknown): WsCommand | null {
    if (typeof raw !== 'string') {
      console.error('[WS] unexpected non-string message payload', raw);
      return null;
    }

    try {
      return JSON.parse(raw) as WsCommand;
    } catch (err) {
      console.error('[WS] failed to parse message JSON', err);
      return null;
    }
  }

  private routeCommand(command: WsCommand): void {
    switch (command.type) {
      case 'INIT':
        this.handleInitCommand(command.payload);
        break;
      default:
        break;
    }
  }

  private handleInitCommand(payload: unknown): void {
    if (this.zoomInitializing) {
      this.sendInitResponse('ERROR', 'Zoom SDK initialization already in progress', true);
      return;
    }

    if (this.zoomInitialized) {
      this.sendInitResponse('ERROR', 'Zoom SDK already initialized', true);
      return;
    }

    const validatedPayload = this.validateInitPayload(payload);
    if (!validatedPayload) {
      return;
    }

    this.zoomConfig = validatedPayload;
    this.zoomInitializing = true;
    this.armInitTimeout();

    this.ngZone.runOutsideAngular(() => {
      try {
        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();
        ZoomMtg.i18n.load('en-US');
        ZoomMtg.i18n.reload('en-US');
      } catch (err) {
        this.ngZone.run(() => {
          this.zoomInitializing = false;
          this.clearInitTimeout();
          this.sendInitResponse('ERROR', this.toErrorMessage(err), true);
        });
        return;
      }

      ZoomMtg.init({
        leaveUrl: 'https://www.zoom.com/',
        disableCORP: true,
        isSupportAV: true,
        success: () => {
          this.ngZone.run(() => {
            this.joinMeeting();
          });
        },
        error: (err: unknown) => {
          this.ngZone.run(() => {
            this.zoomInitializing = false;
            this.clearInitTimeout();
            this.sendInitResponse('ERROR', this.toErrorMessage(err), true);
          });
        }
      });
    });
  }

  private joinMeeting(): void {
    if (!this.zoomConfig) {
      this.zoomInitializing = false;
      this.clearInitTimeout();
      this.sendInitResponse('ERROR', 'Zoom configuration missing for join', true);
      return;
    }

    const joinOptions: Parameters<typeof ZoomMtg.join>[0] = {
      signature: this.zoomConfig.signature,
      meetingNumber: this.zoomConfig.meetingNumber,
      passWord: this.zoomConfig.passWord,
      userName: this.zoomConfig.userName,
      sdkKey: this.zoomConfig.sdkKey,
      success: () => {
        this.ngZone.run(() => {
          this.zoomInitializing = false;
          this.zoomInitialized = true;
          this.clearInitTimeout();
          this.sendInitResponse('OK');
        });
      },
      error: (err: unknown) => {
        this.ngZone.run(() => {
          this.zoomInitializing = false;
          this.clearInitTimeout();
          this.sendInitResponse('ERROR', this.toErrorMessage(err), true);
        });
      }
    };

    if (this.zoomConfig.tk) {
      joinOptions['tk'] = this.zoomConfig.tk;
      if (this.zoomConfig.userEmail) {
        joinOptions['userEmail'] = this.zoomConfig.userEmail;
      }
    }

    if (this.zoomConfig.zak) {
      joinOptions['zak'] = this.zoomConfig.zak;
    }

    ZoomMtg.join(joinOptions);
  }

  private validateInitPayload(payload: unknown): ZoomInitPayload | null {
    if (!payload || typeof payload !== 'object') {
      this.sendInitResponse('ERROR', 'INIT payload must be an object', true);
      return null;
    }

    const candidate = payload as Partial<ZoomInitPayload>;
    const required: Array<keyof ZoomInitPayload> = [
      'sdkKey',
      'signature',
      'meetingNumber',
      'passWord',
      'userName'
    ];
    const missing = required.filter((field) => !candidate[field]);
    if (missing.length > 0) {
      this.sendInitResponse('ERROR', `Missing required fields: ${missing.join(', ')}`, true);
      return null;
    }

    if (candidate.tk && !candidate.userEmail) {
      this.sendInitResponse('ERROR', 'userEmail is required when tk is provided', true);
      return null;
    }

    return candidate as ZoomInitPayload;
  }

  private sendInitResponse(status: 'OK' | 'ERROR', error?: string, includeLogs = false): void {
    const message: Record<string, unknown> = {
      type: 'INIT_DONE',
      status
    };

    if (error) {
      message['error'] = error;
    }

    this.sendMessage(message);

    if (includeLogs) {
      this.sendConsoleDump();
    }
  }

  private sendConsoleDump(): void {
    const logs = this.consoleBuffer.getLogs();
    const formattedLogs = logs.map(entry => ({
      timestamp: entry.timestamp,
      level: entry.level.toUpperCase(),
      message: entry.message.map(msg =>
        typeof msg === 'string' ? msg : JSON.stringify(msg)
      ).join(' ')
    }));

    this.sendMessage({
      type: 'CONSOLE_DUMP',
      logs : formattedLogs
    });
  }

  private toErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return typeof err === 'string' ? err : 'Unknown Zoom SDK error';
  }

  private armInitTimeout(): void {
    this.clearInitTimeout();
    this.initTimeoutHandle = window.setTimeout(() => this.onInitTimeout(), 5000);
  }

  private clearInitTimeout(): void {
    if (this.initTimeoutHandle !== null) {
      clearTimeout(this.initTimeoutHandle);
      this.initTimeoutHandle = null;
    }
  }

  private onInitTimeout(): void {
    if (!this.zoomInitializing || this.zoomInitialized) {
      return;
    }
    this.zoomInitializing = false;
    this.sendInitResponse('ERROR', 'SDK not loaded', true);
  }

  private setStatus(status: WsStatus): void {
    this.status.set(status);
  }
}
