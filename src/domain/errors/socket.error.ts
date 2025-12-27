import { DomainError, DomainErrorDetails } from './domain-error';

export type SocketErrorCode = 'socket_not_connected' | 'socket_timeout' | 'socket_parse_failed';

export class SocketError extends DomainError {
  constructor(code: SocketErrorCode, message: string, details?: DomainErrorDetails) {
    super(code, message, details);
  }
}
