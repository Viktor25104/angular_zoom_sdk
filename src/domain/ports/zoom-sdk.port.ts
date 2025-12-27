import { ZoomInitOptions, ZoomInitPayload } from '../value-objects/zoom-config';

export abstract class ZoomSdkPort {
  abstract prepareClient(): void;
  abstract init(options: ZoomInitOptions): Promise<void>;
  abstract join(payload: ZoomInitPayload): Promise<void>;
}
