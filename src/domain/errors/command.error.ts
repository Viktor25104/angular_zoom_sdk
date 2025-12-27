import { DomainError, DomainErrorDetails } from './domain-error';

export type CommandErrorCode = 'command_unknown' | 'command_handler_failed';

export class CommandError extends DomainError {
  constructor(code: CommandErrorCode, message: string, details?: DomainErrorDetails) {
    super(code, message, details);
  }
}
