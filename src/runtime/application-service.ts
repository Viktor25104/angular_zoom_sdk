import { Inject, Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { LoggerPort } from '../domain/ports/logger.port';
import { LogBufferPort, LogEntry } from '../domain/ports/log-buffer.port';
import { ZoomSdkPort } from '../domain/ports/zoom-sdk.port';
import { ZoomInitOptions, ZoomInitPayload } from '../domain/value-objects/zoom-config';
import { SchedulerPort } from '../domain/ports/scheduler.port';
import { ValidationError } from '../domain/errors/validation.error';
import { ZoomError } from '../domain/errors/zoom.error';
import { DomError } from '../domain/errors/dom.error';
import { RuntimeEvent } from './dto/runtime-event';
import { DomDriverPort, DomSelector } from '../domain/ports/dom-driver.port';

@Injectable({
  providedIn: 'root'
})
export class MeetingApplicationService {
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
  private initCompletionResolve?: () => void;
  private initCompletionReject?: (err: Error) => void;
  private readonly selectors: DomSelector;

  private readonly events = new Subject<RuntimeEvent>();

  constructor(
    private readonly ngZone: NgZone,
    @Inject(ZoomSdkPort) private readonly zoom: ZoomSdkPort,
    @Inject(SchedulerPort) private readonly scheduler: SchedulerPort,
    @Inject(LogBufferPort) private readonly logBuffer: LogBufferPort,
    @Inject(DomDriverPort) private readonly dom: DomDriverPort,
    private readonly logger: LoggerPort
  ) {
    this.selectors = this.dom.getSelectors();
  }

  events$(): Observable<RuntimeEvent> {
    return this.events.asObservable();
  }

  getLogs(): LogEntry[] {
    return this.logBuffer.getLogs();
  }

  async init(rawPayload: unknown): Promise<void> {
    this.logger.info('init_command_received');
    if (this.zoomInitializing) {
      throw new ZoomError('zoom_init_failed', 'Zoom SDK initialization already in progress');
    }
    if (this.zoomInitialized) {
      throw new ZoomError('zoom_init_failed', 'Zoom SDK already initialized');
    }

    const payload = this.validateInitPayload(rawPayload);
    this.zoomConfig = payload;
    this.zoomInitializing = true;
    this.armInitTimeout();

    const completionPromise = new Promise<void>((resolve, reject) => {
      this.initCompletionResolve = resolve;
      this.initCompletionReject = reject;
    });

    await new Promise<void>((resolve, reject) => {
      this.ngZone.runOutsideAngular(() => {
        try {
          this.zoom.prepareClient();
          this.zoom
            .init(this.getZoomInitOptions())
            .then(() => {
              this.ngZone.run(() => {
                this.startJoinFlow();
                resolve();
              });
            })
            .catch((err) => {
              this.ngZone.run(() => {
                this.zoomInitializing = false;
                this.clearInitTimeout();
                reject(new ZoomError('zoom_init_failed', this.toErrorMessage(err)));
              });
            });
        } catch (err) {
          this.ngZone.run(() => {
            this.zoomInitializing = false;
            this.clearInitTimeout();
            reject(new ZoomError('zoom_init_failed', this.toErrorMessage(err)));
          });
        }
      });
    });

    await completionPromise;
    this.logger.info('init_command_completed');
  }

  async join(): Promise<void> {
    this.logger.info('join_command_received');
    this.ensureZoomReady();

    try {
      const audioButton = await this.waitForSelector<HTMLButtonElement>(this.selectors.button.previewAudio);
      await this.ensureControlButtonState(audioButton, 'Unmute');
      const videoButton = await this.waitForSelector<HTMLButtonElement>(this.selectors.button.previewVideo);
      await this.ensureControlButtonState(videoButton, 'Start Video');
      const joinButton = await this.waitForSelector<HTMLButtonElement>(this.selectors.button.previewJoin);
      joinButton.click();
      this.startMeetingStateWatch();
      this.startChatMonitor();
      this.logger.info('join_command_completed');
    } catch (err) {
      throw new DomError('dom_selector_not_found', this.toErrorMessage(err));
    }
  }

  async sendChat(rawPayload: unknown): Promise<void> {
    this.logger.info('send_command_received');
    this.ensureZoomReady();
    const message = this.validateSendPayload(rawPayload);

    try {
      await this.ensureChatPanelOpen();
      const editor = await this.waitForSelector<HTMLDivElement>(this.selectors.chat.editor);
      this.injectMessage(editor, message);

      const sendButton = await this.waitForSendButton();
      sendButton.click();

      await this.closeChatPanel();
      this.logger.info('send_command_completed');
    } catch (err) {
      throw new DomError('dom_selector_not_found', this.toErrorMessage(err));
    }
  }

  async getParticipantsCount(): Promise<number> {
    this.logger.debug('participants_command_received');
    this.ensureZoomReady();
    const countElement = this.dom.query<HTMLElement>(this.selectors.indicator.participantsCount);
    if (!countElement) {
      throw new DomError('dom_selector_not_found', 'Participants indicator not found');
    }

    const parsed = Number(countElement.textContent?.trim());
    if (Number.isNaN(parsed)) {
      throw new ValidationError('Unable to parse participant count');
    }

    this.logger.debug('participants_command_completed', { count: parsed });
    return parsed;
  }

  async openParticipantsPanel(): Promise<void> {
    this.logger.info('open_participants_panel_command_received');
    this.ensureZoomReady();
    const button = await this.waitForSelector<HTMLButtonElement>(this.selectors.button.participants);
    if (this.isParticipantsPanelVisible(button)) {
      return;
    }

    button.click();
    await this.waitForParticipantsPanelOpen(button);
    this.logger.info('open_participants_panel_command_completed');
  }

  async leaveMeeting(): Promise<void> {
    this.logger.info('leave_command_received');
    this.ensureZoomReady();
    try {
      const leaveButton = this.findLeaveButton();
      if (!leaveButton) {
        throw new DomError('dom_selector_not_found', 'Leave button not found');
      }

      leaveButton.click();
      const confirmButton = await this.waitForSelector<HTMLButtonElement>(this.selectors.button.leaveConfirm);
      confirmButton.click();

      this.zoomInitialized = false;
      this.zoomInitializing = false;
      this.clearInitTimeout();
      this.meetingStateReported = false;
      this.stopChatMonitor();
      this.disposeMeetingStateObserver();
      this.chatPanelOpen = false;
      this.logger.info('leave_command_completed');
    } catch (err) {
      if (err instanceof DomError) {
        throw err;
      }
      throw new DomError('dom_selector_not_found', this.toErrorMessage(err));
    }
  }

  private ensureZoomReady(): void {
    if (!this.zoomInitialized) {
      throw new ZoomError('zoom_not_initialized', 'Zoom SDK not initialized');
    }
  }

  private startJoinFlow(): void {
    if (!this.zoomConfig) {
      this.rejectInitCompletion(new ZoomError('zoom_init_failed', 'Zoom configuration missing for join'));
      return;
    }

    this.zoom
      .join(this.zoomConfig)
      .then(() => {
        this.zoomInitializing = false;
        this.zoomInitialized = true;
        this.clearInitTimeout();
        this.resolveInitCompletion();
      })
      .catch((err: unknown) => {
        this.zoomInitializing = false;
        this.clearInitTimeout();
        this.rejectInitCompletion(new ZoomError('zoom_join_failed', this.toErrorMessage(err)));
      });
  }

  private validateInitPayload(payload: unknown): ZoomInitPayload {
    if (!payload || typeof payload !== 'object') {
      throw new ValidationError('INIT payload must be an object');
    }

    const candidate = payload as Partial<ZoomInitPayload>;
    const required: Array<keyof ZoomInitPayload> = ['sdkKey', 'signature', 'meetingNumber', 'passWord', 'userName'];
    const missing = required.filter((key) => !candidate[key] || typeof candidate[key] !== 'string');
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }

    if (candidate.tk && !candidate.userEmail) {
      throw new ValidationError('userEmail is required when tk is provided');
    }

    return candidate as ZoomInitPayload;
  }

  private validateSendPayload(payload: unknown): string {
    if (!payload || typeof payload !== 'object') {
      throw new ValidationError('SEND payload must be an object');
    }

    const candidate = payload as { message?: unknown };
    if (typeof candidate.message !== 'string') {
      throw new ValidationError('SEND payload must include a message string');
    }

    const trimmed = candidate.message.trim();
    if (!trimmed) {
      throw new ValidationError('Message cannot be empty');
    }

    return trimmed;
  }

  private toErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return typeof err === 'string' ? err : 'Unknown error';
  }

  private getZoomInitOptions(): ZoomInitOptions {
    return {
      leaveUrl: 'https://www.zoom.com/',
      disableCORP: true,
      isSupportAV: true
    };
  }

  private armInitTimeout(): void {
    this.clearInitTimeout();
    this.initTimeoutHandle = this.scheduler.setTimeout(() => this.onInitTimeout(), 5000);
  }

  private clearInitTimeout(): void {
    if (this.initTimeoutHandle !== null) {
      this.scheduler.clearTimeout(this.initTimeoutHandle);
      this.initTimeoutHandle = null;
    }
  }

  private onInitTimeout(): void {
    if (!this.zoomInitializing || this.zoomInitialized) {
      return;
    }
    this.initTimeoutHandle = null;

    if (this.hasZoomDomContent()) {
      this.zoomInitializing = false;
      this.zoomInitialized = true;
      this.resolveInitCompletion();
      return;
    }

    this.zoomInitializing = false;
    this.rejectInitCompletion(new ZoomError('zoom_init_failed', 'SDK not loaded'));
  }

  private resolveInitCompletion(): void {
    this.initCompletionResolve?.();
    this.initCompletionResolve = undefined;
    this.initCompletionReject = undefined;
  }

  private rejectInitCompletion(err: Error): void {
    if (this.initCompletionReject) {
      this.initCompletionReject(err);
    }
    this.initCompletionResolve = undefined;
    this.initCompletionReject = undefined;
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
    return !!this.dom.query(this.selectors.panel.participantsContainer);
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
          reject(new DomError('dom_timeout', 'Participants panel did not open in time'));
          return;
        }
        this.scheduler.setTimeout(verify, interval);
      };
      verify();
    });
  }

  private findLeaveButton(): HTMLButtonElement | null {
    return this.dom.query<HTMLButtonElement>(this.selectors.button.leaveOptions);
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
    const tips = this.dom.queryAll<HTMLElement>(this.selectors.chat.tipContainer);
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

    this.emitEvent('CHAT_COMMAND', { from, message });
  }

  private stopChatMonitor(): void {
    this.chatTipObserver?.disconnect();
    this.chatTipObserver = undefined;
    this.chatMonitorStarted = false;
    this.lastChatTipSignature = null;
  }

  private waitForSelector<T extends Element>(selector: string, timeout = 5000, interval = 100): Promise<T> {
    return this.dom.waitForElement<T>(selector, { timeoutMs: timeout, intervalMs: interval });
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
          reject(new DomError('dom_timeout', `Timed out waiting for aria-label "${desiredLabel}"`));
          return;
        }
        this.scheduler.setTimeout(verify, interval);
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

    const waitingRoomTip = this.dom.query<HTMLElement>(this.selectors.indicator.waitingRoomTip);
    if (waitingRoomTip?.textContent?.includes('Waiting for the host')) {
      this.meetingStateReported = true;
      this.emitEvent('MEETING_STATE', { state: 'WAITING_ROOM' });
      this.disposeMeetingStateObserver();
      return;
    }

    const endButton = this.dom.query<HTMLElement>(this.selectors.indicator.endButton);
    const meetingHeader = this.dom.query<HTMLElement>(this.selectors.indicator.meetingHeader);
    if (endButton || meetingHeader) {
      this.meetingStateReported = true;
      this.emitEvent('MEETING_STATE', { state: 'IN_MEETING' });
      this.disposeMeetingStateObserver();
      this.startChatMonitor();
    }
  }

  private disposeMeetingStateObserver(): void {
    this.meetingStateObserver?.disconnect();
    this.meetingStateObserver = undefined;
  }

  private async ensureChatPanelOpen(): Promise<void> {
    if (this.chatPanelOpen || this.isChatPanelVisible()) {
      this.chatPanelOpen = true;
      return;
    }

    const chatButton = await this.waitForSelector<HTMLButtonElement>(this.selectors.button.chatToggle);
    chatButton.click();
    await this.waitForSelector<HTMLDivElement>(this.selectors.chat.editor);
    this.chatPanelOpen = true;
  }

  private async closeChatPanel(): Promise<void> {
    if (!this.chatPanelOpen && !this.isChatPanelVisible()) {
      return;
    }

    const closeButton = this.dom.query<HTMLButtonElement>(this.selectors.chat.closeButton);
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
          reject(new DomError('dom_timeout', 'Chat panel did not close in time'));
          return;
        }
        this.scheduler.setTimeout(verify, interval);
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
        const button = this.dom.query<HTMLButtonElement>(this.selectors.button.chatSend);
        if (button && !button.classList.contains('chat-rtf-box__send--disabled')) {
          resolve(button);
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new DomError('dom_timeout', 'Send button not ready'));
          return;
        }
        this.scheduler.setTimeout(lookup, interval);
      };
      lookup();
    });
  }

  private isChatPanelVisible(): boolean {
    return !!this.dom.query(this.selectors.button.chatSend);
  }

  private emitEvent(type: string, payload?: Record<string, unknown>): void {
    this.events.next({ type, payload });
  }
}
