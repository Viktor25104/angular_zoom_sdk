import { DomainError, DomainErrorDetails } from './domain-error';

export class ValidationError extends DomainError {
  constructor(message: string, details?: DomainErrorDetails) {
    super('validation_error', message, details);
  }
}
