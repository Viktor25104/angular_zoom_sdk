import { Inject, Injectable, NgZone, signal } from '@angular/core';
import { ZoomMtg } from '@zoom/meetingsdk';
import { LoggerPort } from '../../domain/ports/logger.port';
import { CLIENT_ENV, ClientEnv } from '../../infrastructure/config/env';
import { LOGGER_PORT } from '../../infrastructure/config/dependency-injection';
import { ConsoleBufferService } from '../../infrastructure/logging/console-buffer.service';

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
  private readonly wsUrl: string;
  private zoomConfig?: ZoomInitPayload;
  private zoomInitialized = false;
  private zoomInitializing = false;
  private initTimeoutHandle: number | null = null;
  private meetingStateObserver?: MutationObserver;
  private meetingStateReported = false;
  private chatPanelOpen = false;
  private chatMonitorStarted = false;
  private chatTipObserver?: MutationObserver;
  private lastChatTipSignature: { node: HTMLElement; text: string; timestamp: number } | null = null;

  constructor(
    private readonly ngZone: NgZone,
    private readonly consoleBuffer: ConsoleBufferService,
    @Inject(CLIENT_ENV) private readonly env: ClientEnv,
    @Inject(LOGGER_PORT) private readonly logger: LoggerPort
  ) {
    this.wsUrl = this.env.ws.url;
    this.logger.info('ws_connecting', { url: this.wsUrl });
    this.openSocket();
  }

  private openSocket(): void {
    try {
      this.socket = new WebSocket(this.wsUrl);
    } catch (err) {
      this.logger.error('ws_socket_create_failed', {
        message: err instanceof Error ? err.message : 'unknown_error'
      });
      this.setStatus('disconnected');
      return;
    }

    this.socket.addEventListener('open', () => {
      this.ngZone.run(() => {
        this.logger.info('ws_connected', { url: this.wsUrl });
        this.setStatus('connected');
        this.sendHello();
      });
    });

    this.socket.addEventListener('close', (event) => {
      this.ngZone.run(() => {
        this.logger.warn('ws_disconnected', {
          code: (event as CloseEvent).code,
          reason: (event as CloseEvent).reason,
          wasClean: (event as CloseEvent).wasClean
        });
        this.setStatus('disconnected');
      });
    });

    this.socket.addEventListener('error', (event) => {
      this.ngZone.run(() => {
        this.logger.error('ws_error', { event });
        this.setStatus('disconnected');
      });
    });

    this.socket.addEventListener('message', (event) => {
      this.ngZone.run(() => {
        this.logger.debug('ws_message_received');
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
      this.logger.warn('ws_send_skipped_socket_closed', {
        readyState: this.socket?.readyState ?? 'no_socket',
        payload: message
      });
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  private parseCommand(raw: unknown): WsCommand | null {
    if (typeof raw !== 'string') {
      this.logger.error('ws_invalid_payload_type', { payloadType: typeof raw });
      return null;
    }

    try {
      return JSON.parse(raw) as WsCommand;
    } catch (err) {
      this.logger.error('ws_parse_failed', {
        message: err instanceof Error ? err.message : 'unknown_parse_error'
      });
      return null;
    }
  }

  private routeCommand(command: WsCommand): void {
    this.logger.debug('ws_command_routed', { type: command.type });
    switch (command.type) {
      case 'INIT':
        this.handleInitCommand(command.payload);
        break;
      case 'JOIN':
        void this.handleJoinCommand();
        break;
      case 'SEND':
        void this.handleSendCommand(command.payload);
        break;
      case 'PARTICIPANTS':
        this.handleParticipantsCommand();
        break;
      case 'OPEN_PARTICIPANTS_PANEL':
        void this.handleOpenParticipantsPanelCommand();
        break;
      case 'LEAVE_MEETING':
        void this.handleLeaveMeetingCommand();
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

  private async handleJoinCommand(): Promise<void> {
    if (!this.zoomInitialized) {
      this.sendJoinResponse('ERROR', 'Zoom SDK not initialized', true);
      return;
    }

    try {
      const audioButton = await this.waitForElement<HTMLButtonElement>('#preview-audio-control-button');
      await this.ensureControlButtonState(audioButton, 'Unmute');

      const videoButton = await this.waitForElement<HTMLButtonElement>('#preview-video-control-button');
      await this.ensureControlButtonState(videoButton, 'Start Video');

      const joinButton = await this.waitForElement<HTMLButtonElement>('.preview-join-button');
      joinButton.click();
      this.startMeetingStateWatch();
      this.startChatMonitor();

      this.sendJoinResponse('OK');
    } catch (err) {
      this.sendJoinResponse('ERROR', this.toErrorMessage(err), true);
    }
  }

  private async handleSendCommand(payload: unknown): Promise<void> {
    if (!this.zoomInitialized) {
      this.sendSendResponse('ERROR', 'Zoom SDK not initialized', true);
      return;
    }

    const message = this.validateSendPayload(payload);
    if (!message) {
      return;
    }

    try {
      await this.ensureChatPanelOpen();
      const editor = await this.waitForElement<HTMLDivElement>('.tiptap.ProseMirror[contenteditable="true"]');
      this.injectMessage(editor, message);

      const sendButton = await this.waitForSendButton();
      sendButton.click();

      await this.closeChatPanel();
      this.sendSendResponse('OK');
    } catch (err) {
      this.sendSendResponse('ERROR', this.toErrorMessage(err), true);
    }
  }

  private handleParticipantsCommand(): void {
    if (!this.zoomInitialized) {
      this.sendParticipantsResponse('ERROR', undefined, 'Zoom SDK not initialized', true);
      return;
    }

    const countElement = document.querySelector('.footer-button__number-counter span');
    if (!countElement) {
      this.sendParticipantsResponse('ERROR', undefined, 'Participants indicator not found', true);
      return;
    }

    const parsed = Number(countElement.textContent?.trim());
    if (Number.isNaN(parsed)) {
      this.sendParticipantsResponse('ERROR', undefined, 'Unable to parse participant count', true);
      return;
    }

    this.sendParticipantsResponse('OK', parsed);
  }

  private async handleOpenParticipantsPanelCommand(): Promise<void> {
    if (!this.zoomInitialized) {
      this.sendParticipantsPanelResponse('ERROR', 'Zoom SDK not initialized', true);
      return;
    }

    try {
      const participantsButton = await this.waitForElement<HTMLButtonElement>(
        'button.footer-button-base__button[aria-label*="manage participants list pane"]'
      );

      if (!this.isParticipantsPanelVisible(participantsButton)) {
        participantsButton.click();
        await this.waitForParticipantsPanelOpen(participantsButton);
      }

      this.sendParticipantsPanelResponse('OK');
    } catch (err) {
      this.sendParticipantsPanelResponse('ERROR', this.toErrorMessage(err), true);
    }
  }

  private async handleLeaveMeetingCommand(): Promise<void> {
    if (!this.zoomInitialized) {
      this.sendLeaveMeetingResponse('ERROR', 'Zoom SDK not initialized', true);
      return;
    }

    try {
      const leaveButton = this.findLeaveButton();
      if (!leaveButton) {
        throw new Error('Leave button not found');
      }

      leaveButton.click();
      const confirmButton = await this.waitForElement<HTMLButtonElement>(
        '.leave-meeting-options__btn--danger'
      );
      confirmButton.click();

      this.zoomInitialized = false;
      this.zoomInitializing = false;
      this.clearInitTimeout();
      this.meetingStateReported = false;
      this.stopChatMonitor();
      this.disposeMeetingStateObserver();
      this.chatPanelOpen = false;

      this.sendLeaveMeetingResponse('OK');
    } catch (err) {
      this.sendLeaveMeetingResponse('ERROR', this.toErrorMessage(err), true);
    }
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

  private sendJoinResponse(status: 'OK' | 'ERROR', error?: string, includeLogs = false): void {
    const message: Record<string, unknown> = {
      type: 'JOIN_DONE',
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

  private sendSendResponse(status: 'OK' | 'ERROR', error?: string, includeLogs = false): void {
    const message: Record<string, unknown> = {
      type: 'SEND_DONE',
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

  private sendParticipantsResponse(
    status: 'OK' | 'ERROR',
    count?: number,
    error?: string,
    includeLogs = false
  ): void {
    const message: Record<string, unknown> = {
      type: 'PARTICIPANTS_DONE',
      status
    };

    if (typeof count === 'number') {
      message['count'] = count;
    }

    if (error) {
      message['error'] = error;
    }

    this.sendMessage(message);

    if (includeLogs) {
      this.sendConsoleDump();
    }
  }

  private sendParticipantsPanelResponse(status: 'OK' | 'ERROR', error?: string, includeLogs = false): void {
    const message: Record<string, unknown> = {
      type: 'OPEN_PARTICIPANTS_PANEL_DONE',
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

  private sendLeaveMeetingResponse(status: 'OK' | 'ERROR', error?: string, includeLogs = false): void {
    const message: Record<string, unknown> = {
      type: 'LEAVE_MEETING_DONE',
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
    this.initTimeoutHandle = null;

    if (this.hasZoomDomContent()) {
      console.log('[WS] INIT timeout satisfied via Zoom UI render');
      this.zoomInitializing = false;
      this.zoomInitialized = true;
      this.sendInitResponse('OK');
      return;
    }

    this.zoomInitializing = false;
    this.sendInitResponse('ERROR', 'SDK not loaded', true);
  }

  private setStatus(status: WsStatus): void {
    this.status.set(status);
  }

  private hasZoomDomContent(): boolean {
    const root = document.getElementById('zmmtg-root');
    if (!root) {
      return false;
    }
    const html = root.innerHTML?.trim();
    return !!html;
  }

  private isParticipantsPanelVisible(button?: HTMLButtonElement): boolean {
    const label = button?.getAttribute('aria-label')?.toLowerCase() ?? '';
    if (label.includes('close the manage participants list pane')) {
      return true;
    }
    return !!document.querySelector(
      '.participants-panel, .participant-list__container, .participants-panel__inner, .participants-panel-container'
    );
  }

  private waitForParticipantsPanelOpen(
    button: HTMLButtonElement,
    timeout = 3000,
    interval = 100
  ): Promise<void> {
    const start = Date.now();
    return new Promise<void>((resolve, reject) => {
      const verify = () => {
        if (this.isParticipantsPanelVisible(button)) {
          resolve();
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new Error('Participants panel did not open in time'));
          return;
        }
        window.setTimeout(verify, interval);
      };
      verify();
    });
  }

  private findLeaveButton(): HTMLButtonElement | null {
    return document.querySelector<HTMLButtonElement>(
      'button.footer-button-base__button[aria-label="End"], button.footer-button-base__button[aria-label="Leave"]'
    );
  }

  private startChatMonitor(): void {
    if (this.chatMonitorStarted) {
      return;
    }
    this.chatMonitorStarted = true;
    this.chatTipObserver = new MutationObserver(() => this.processChatTips());
    this.chatTipObserver.observe(document.body, { childList: true, subtree: true });
    this.processChatTips();
  }

  private processChatTips(): void {
    const tips = document.querySelectorAll<HTMLElement>('.last-chat-message-tip__container');
    if (tips.length === 0) {
      return;
    }
    const latest = tips[tips.length - 1];
    this.emitChatTip(latest);
  }

  private emitChatTip(tip: HTMLElement): void {
    const from = tip.querySelector('.last-chat-message-tip__from-to')?.textContent?.trim() ?? '';
    const message = tip.querySelector('.last-chat-message-tip__content')?.textContent?.trim();
    if (!message) {
      return;
    }

    const last = this.lastChatTipSignature;
    if (last && last.node === tip && last.text === message && Date.now() - last.timestamp < 1000) {
      return;
    }
    this.lastChatTipSignature = { node: tip, text: message, timestamp: Date.now() };

    this.sendMessage({
      type: 'CHAT_COMMAND',
      from,
      message
    });
  }

  private stopChatMonitor(): void {
    this.chatTipObserver?.disconnect();
    this.chatTipObserver = undefined;
    this.chatMonitorStarted = false;
    this.lastChatTipSignature = null;
  }

  private waitForElement<T extends Element>(selector: string, timeout = 5000, interval = 100): Promise<T> {
    const start = Date.now();
    return new Promise<T>((resolve, reject) => {
      const lookup = () => {
        const element = document.querySelector(selector) as T | null;
        if (element) {
          resolve(element);
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new Error(`Element not found for selector ${selector}`));
          return;
        }
        window.setTimeout(lookup, interval);
      };
      lookup();
    });
  }

  private async ensureControlButtonState(button: HTMLButtonElement, desiredLabel: string): Promise<void> {
    const currentLabel = button.getAttribute('aria-label');
    if (currentLabel === desiredLabel) {
      return;
    }

    button.click();
    await this.waitForAriaLabel(button, desiredLabel);
  }

  private waitForAriaLabel(
    button: HTMLButtonElement,
    desiredLabel: string,
    timeout = 3000,
    interval = 100
  ): Promise<void> {
    const start = Date.now();
    return new Promise<void>((resolve, reject) => {
      const verify = () => {
        if (button.getAttribute('aria-label') === desiredLabel) {
          resolve();
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new Error(`Timed out waiting for aria-label "${desiredLabel}"`));
          return;
        }
        window.setTimeout(verify, interval);
      };
      verify();
    });
  }

  private startMeetingStateWatch(): void {
    if (this.meetingStateObserver || this.meetingStateReported) {
      return;
    }

    this.meetingStateObserver = new MutationObserver(() => this.evaluateMeetingState());
    this.meetingStateObserver.observe(document.body, { childList: true, subtree: true });
    this.evaluateMeetingState();
  }

  private evaluateMeetingState(): void {
    if (this.meetingStateReported) {
      return;
    }

    const waitingRoomTip = document.querySelector('.wr-tip span');
    if (waitingRoomTip?.textContent?.includes('Waiting for the host')) {
      this.meetingStateReported = true;
      this.sendMessage({ type: 'MEETING_STATE', state: 'WAITING_ROOM' });
      this.disposeMeetingStateObserver();
      return;
    }

    const endButton = document.querySelector('button.footer-button-base__button[aria-label="End"]');
    const meetingHeader = document.querySelector('.meeting-header');
    if (endButton || meetingHeader) {
      this.meetingStateReported = true;
      this.sendMessage({ type: 'MEETING_STATE', state: 'IN_MEETING' });
      this.disposeMeetingStateObserver();
      this.startChatMonitor();
    }
  }

  private disposeMeetingStateObserver(): void {
    this.meetingStateObserver?.disconnect();
    this.meetingStateObserver = undefined;
  }

  private validateSendPayload(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      this.sendSendResponse('ERROR', 'SEND payload must be an object', true);
      return null;
    }

    const candidate = payload as { message?: unknown };
    if (typeof candidate.message !== 'string') {
      this.sendSendResponse('ERROR', 'SEND payload must include a message string', true);
      return null;
    }

    const trimmed = candidate.message.trim();
    if (!trimmed) {
      this.sendSendResponse('ERROR', 'Message cannot be empty', true);
      return null;
    }

    return trimmed;
  }

  private async ensureChatPanelOpen(): Promise<void> {
    if (this.chatPanelOpen || this.isChatPanelVisible()) {
      this.chatPanelOpen = true;
      return;
    }

    const chatButton = await this.waitForElement<HTMLButtonElement>(
      'button.footer-button-base__button[aria-label*="chat panel"]'
    );
    chatButton.click();
    await this.waitForElement<HTMLDivElement>('.tiptap.ProseMirror[contenteditable="true"]');
    this.chatPanelOpen = true;
  }

  private async closeChatPanel(): Promise<void> {
    if (!this.chatPanelOpen && !this.isChatPanelVisible()) {
      return;
    }

    const closeButton = document.querySelector<HTMLButtonElement>(this.chatCloseButtonSelector);
    if (closeButton) {
      closeButton.click();
      await this.waitForChatPanelClosed();
    }
    this.chatPanelOpen = false;
  }

  private waitForChatPanelClosed(timeout = 3000, interval = 100): Promise<void> {
    const start = Date.now();
    return new Promise<void>((resolve, reject) => {
      const verify = () => {
        if (!this.isChatPanelVisible()) {
          resolve();
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new Error('Chat panel did not close in time'));
          return;
        }
        window.setTimeout(verify, interval);
      };
      verify();
    });
  }

  private injectMessage(editor: HTMLDivElement, message: string): void {
    editor.focus();
    editor.innerHTML = '';
    editor.classList.remove('is-empty', 'is-editor-empty');

    const lines = message.split(/\r?\n/);
    lines.forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.style.marginLeft = '0px';
      if (line.length === 0) {
        paragraph.append(document.createElement('br'));
      } else {
        paragraph.append(document.createTextNode(line));
      }
      editor.append(paragraph);
    });

    editor.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: message,
        inputType: 'insertText'
      })
    );
  }

  private waitForSendButton(timeout = 3000, interval = 100): Promise<HTMLButtonElement> {
    const start = Date.now();
    return new Promise<HTMLButtonElement>((resolve, reject) => {
      const lookup = () => {
        const button = document.querySelector<HTMLButtonElement>('button.chat-rtf-box__send');
        if (button && !button.classList.contains('chat-rtf-box__send--disabled')) {
          resolve(button);
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new Error('Send button not ready'));
          return;
        }
        window.setTimeout(lookup, interval);
      };
      lookup();
    });
  }

  private isChatPanelVisible(): boolean {
    return !!document.querySelector('button.chat-rtf-box__send');
  }

  private get chatCloseButtonSelector(): string {
    return 'button.particpant-header__close-right[aria-label="Close"]';
  }
}
