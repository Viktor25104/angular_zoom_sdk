export interface DomainErrorDetails {
  [key: string]: unknown;
}

/**
 * Base error for all typed failures that should flow through the websocket channel.
 */
export abstract class DomainError extends Error {
  readonly code: string;
  readonly details?: DomainErrorDetails;

  protected constructor(code: string, message: string, details?: DomainErrorDetails) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
