import { Component, NgZone, OnInit } from '@angular/core';
import { ZoomMtg } from '@zoom/meetingsdk';

/**
 * Strongly typed runtime credentials injected via `window.__ZOOM_CONFIG__`.
 */
interface ZoomRuntimeConfig {
  sdkKey: string;
  signature: string;
  meetingNumber: string;
  passWord: string;
  userName: string;
  userEmail?: string;
  tk?: string;
  zak?: string;
}

/**
 * Augments the Window interface so TypeScript understands our runtime hook.
 */
declare global {
  interface Window {
    __ZOOM_CONFIG__?: ZoomRuntimeConfig;
  }
}

@Component({
  selector: 'app-root',
  imports: [],
  template: ``,
  standalone: true
})
export class App implements OnInit {
  /**
   * Resolved runtime configuration used to initialize and join meetings.
   */
  private readonly config: ZoomRuntimeConfig;

  /**
   * Reads the runtime configuration immediately so we fail fast when values are missing.
   */
  constructor(private readonly ngZone: NgZone) {
    const cfg = window.__ZOOM_CONFIG__;
    if (!cfg) {
      console.error('[ZOOM] __ZOOM_CONFIG__ not found on window');
      throw new Error('Zoom runtime config is missing');
    }
    this.config = cfg;

    if (this.config.tk && !this.config.userEmail) {
      throw new Error('Zoom runtime config requires userEmail when tk is provided');
    }
  }

  /**
   * Boots the Zoom Web SDK once the DOM is fully loaded.
   */
  ngOnInit(): void {
    console.log('[ZOOM] App ngOnInit -> init Zoom with runtime config');
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        this.startZoom();
      }
    });
  }

  /**
   * Initializes the Zoom Web SDK outside Angular's change detection context.
   */
  private startZoom(): void {
    this.ngZone.runOutsideAngular(() => {
      ZoomMtg.preLoadWasm();
      ZoomMtg.prepareWebSDK();
      ZoomMtg.i18n.load('en-US');
      ZoomMtg.i18n.reload('en-US');

      ZoomMtg.init({
        leaveUrl: 'https://www.zoom.com/',
        disableCORP: true,
        isSupportAV: true,
        success: () => setTimeout(() => this.join(), 1000),
        error: (err: unknown) => {
          console.error('[ZOOM] init error', err);
        }
      });
    });
  }

  /**
   * Joins the configured meeting and surfaces the result for easier debugging.
   */
  private join(): void {
    const joinOptions: any = {
      signature: this.config.signature,
      meetingNumber: this.config.meetingNumber,
      passWord: this.config.passWord,
      userName: this.config.userName,
      success: (res: unknown) => {
        console.log('[ZOOM] join success', res);
      },
      error: (err: unknown) => {
        console.error('[ZOOM] join error', err);
      }
    };

    if (this.config.tk) {
      joinOptions.tk = this.config.tk;
      joinOptions.userEmail = this.config.userEmail;
    }

    if (this.config.zak) {
      joinOptions.zak = this.config.zak;
    }

    ZoomMtg.join(joinOptions);
  }
}
