import { DomainError, DomainErrorDetails } from './domain-error';

export type ZoomErrorCode = 'zoom_init_failed' | 'zoom_join_failed' | 'zoom_not_initialized';

export class ZoomError extends DomainError {
  constructor(code: ZoomErrorCode, message: string, details?: DomainErrorDetails) {
    super(code, message, details);
  }
}
