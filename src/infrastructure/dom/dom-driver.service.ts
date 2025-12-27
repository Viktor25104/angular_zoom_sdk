import { Injectable } from '@angular/core';
import { DomDriverPort, DomSelector, DomQueryOptions } from '../../domain/ports/dom-driver.port';
import { DomError } from '../../domain/errors/dom.error';

const SELECTORS: DomSelector = {
  button: {
    previewAudio: '#preview-audio-control-button',
    previewVideo: '#preview-video-control-button',
    previewJoin: '.preview-join-button',
    chatToggle: 'button.footer-button-base__button[aria-label*="chat panel"]',
    chatSend: 'button.chat-rtf-box__send',
    participants: 'button.footer-button-base__button[aria-label*="participants"]',
    leaveOptions: 'button.footer-button-base__button[aria-label="End"], button.footer-button-base__button[aria-label="Leave"]',
    leaveConfirm: '.leave-meeting-options__btn--danger'
  },
  indicator: {
    participantsCount: '.footer-button__number-counter span',
    waitingRoomTip: '.wr-tip span',
    meetingHeader: '.meeting-header',
    endButton: 'button.footer-button-base__button[aria-label="End"]'
  },
  chat: {
    editor: '.tiptap.ProseMirror[contenteditable="true"]',
    tipContainer: '.last-chat-message-tip__container',
    closeButton: 'button.particpant-header__close-right[aria-label="Close"]'
  },
  panel: {
    participantsContainer:
      '.participants-panel, .participant-list__container, .participants-panel__inner, .participants-panel-container'
  }
};

@Injectable({
  providedIn: 'root'
})
export class DomDriverService extends DomDriverPort {
  override getSelectors(): DomSelector {
    return SELECTORS;
  }

  override query<T extends Element>(selector: string): T | null {
    return document.querySelector<T>(selector);
  }

  override queryAll<T extends Element>(selector: string): T[] {
    return Array.from(document.querySelectorAll<T>(selector));
  }

  override click(selector: string | Element): void {
    const element = typeof selector === 'string' ? this.query(selector) : selector;
    if (!element) {
      throw new DomError('dom_selector_not_found', `Element not found for selector ${selector}`);
    }
    (element as HTMLElement).click();
  }

  override waitForElement<T extends Element>(selector: string, options?: DomQueryOptions): Promise<T> {
    const timeout = options?.timeoutMs ?? 5000;
    const interval = options?.intervalMs ?? 100;
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const lookup = () => {
        const element = this.query<T>(selector);
        if (element) {
          resolve(element);
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new DomError('dom_selector_not_found', `Element not found for selector ${selector}`));
          return;
        }
        window.setTimeout(lookup, interval);
      };
      lookup();
    });
  }

  override waitForCondition(condition: () => boolean, options?: DomQueryOptions): Promise<void> {
    const timeout = options?.timeoutMs ?? 3000;
    const interval = options?.intervalMs ?? 100;
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const verify = () => {
        if (condition()) {
          resolve();
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new DomError('dom_timeout', 'Condition not satisfied in time'));
          return;
        }
        window.setTimeout(verify, interval);
      };
      verify();
    });
  }
}
