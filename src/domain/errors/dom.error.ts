import { DomainError, DomainErrorDetails } from './domain-error';

export type DomErrorCode = 'dom_selector_not_found' | 'dom_timeout';

export class DomError extends DomainError {
  constructor(code: DomErrorCode, message: string, details?: DomainErrorDetails) {
    super(code, message, details);
  }
}
