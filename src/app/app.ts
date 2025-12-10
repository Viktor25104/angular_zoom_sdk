import { Component, NgZone, OnInit } from '@angular/core';
import { ZoomMtg } from '@zoom/meetingsdk';

interface ZoomRuntimeConfig {
  sdkKey: string;
  signature: string;
  meetingNumber: string;
  passWord: string;
  zak: string;
}

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

  private readonly config: ZoomRuntimeConfig

  constructor(private ngZone: NgZone) {
    const cfg = window.__ZOOM_CONFIG__;
    if (!cfg) {
      console.error('[ZOOM] __ZOOM_CONFIG__ not found on window');
      throw new Error('Zoom runtime config is missing');
    }
    this.config = cfg;
  }

  ngOnInit(): void {
    console.log('[ZOOM] App ngOnInit -> init Zoom with runtime config');
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        this.startZoom()
      }
    })
  }

  private startZoom(): void {
    this.ngZone.runOutsideAngular(() => {
      ZoomMtg.preLoadWasm()
      ZoomMtg.prepareWebSDK()
      ZoomMtg.i18n.load('en-US');
      ZoomMtg.i18n.reload('en-US');

      ZoomMtg.init({
        leaveUrl: 'https://www.zoom.com/',
        disableCORP: true,
        isSupportAV: true,
        success: () =>
          setTimeout(() => this.join(), 1000),
        error: (err: any) => {
          console.error('[ZOOM] init error', err);
        }
      });
    });
  }

  private join(): void {
    ZoomMtg.join({
      signature: this.config.signature,
      meetingNumber: this.config.meetingNumber,
      passWord: this.config.passWord,
      userName: 'Bot',
      zak: this.config.zak,
      success: (res: any) => {
        console.log('[ZOOM] join success', res);
      },
      error: (err: any) => {
        console.error('[ZOOM] join error', err);
      }
    });
  }

}
