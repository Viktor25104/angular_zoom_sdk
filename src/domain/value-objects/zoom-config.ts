export interface ZoomInitPayload {
  sdkKey: string;
  signature: string;
  meetingNumber: string;
  passWord: string;
  userName: string;
  userEmail?: string;
  tk?: string;
  zak?: string;
}

export interface ZoomInitOptions {
  leaveUrl: string;
  disableCORP: boolean;
  isSupportAV: boolean;
}
