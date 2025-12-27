import { Injectable } from '@angular/core';
import { ZoomMtg } from '@zoom/meetingsdk';
import { ZoomSdkPort } from '../../domain/ports/zoom-sdk.port';
import { ZoomInitOptions, ZoomInitPayload } from '../../domain/value-objects/zoom-config';

@Injectable({
  providedIn: 'root'
})
export class ZoomWebSdkService extends ZoomSdkPort {
  override prepareClient(): void {
    ZoomMtg.preLoadWasm();
    ZoomMtg.prepareWebSDK();
    ZoomMtg.i18n.load('en-US');
    ZoomMtg.i18n.reload('en-US');
  }

  override init(options: ZoomInitOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      ZoomMtg.init({
        leaveUrl: options.leaveUrl,
        disableCORP: options.disableCORP,
        isSupportAV: options.isSupportAV,
        success: () => resolve(),
        error: (err: unknown) => reject(err)
      });
    });
  }

  override join(payload: ZoomInitPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      ZoomMtg.join({
        sdkKey: payload.sdkKey,
        signature: payload.signature,
        meetingNumber: payload.meetingNumber,
        passWord: payload.passWord,
        userName: payload.userName,
        userEmail: payload.userEmail,
        tk: payload.tk,
        zak: payload.zak,
        success: () => resolve(),
        error: (err: unknown) => reject(err)
      });
    });
  }
}
