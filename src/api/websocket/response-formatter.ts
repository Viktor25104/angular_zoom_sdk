import { Injectable } from '@angular/core';
import { DomainError } from '../../domain/errors/domain-error';
import { CommandError } from '../../domain/errors/command.error';
import { WsResponse } from '../../runtime/dto/ws-response.dto';
import { RuntimeEvent } from '../../runtime/dto/runtime-event';

@Injectable({
  providedIn: 'root'
})
export class ResponseFormatter {
  success(type: string, payload?: unknown, requestId?: string | number): WsResponse {
    return {
      type,
      ok: true,
      requestId,
      payload
    };
  }

  error(
    type: string,
    error: unknown,
    requestId?: string | number,
    details?: Record<string, unknown>
  ): WsResponse {
    if (error instanceof DomainError) {
      return {
        type,
        ok: false,
        requestId,
        error: {
          code: error.code,
          message: error.message,
          details: { ...error.details, ...details }
        }
      };
    }

    const fallback = error instanceof Error ? error.message : 'Unhandled command error';
    const generic = new CommandError('command_handler_failed', fallback);
    return {
      type,
      ok: false,
      requestId,
      error: {
        code: generic.code,
        message: generic.message,
        details
      }
    };
  }

  event(event: RuntimeEvent): WsResponse {
    return {
      type: event.type,
      ok: true,
      payload: event.payload
    };
  }
}
