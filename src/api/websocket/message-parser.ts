import { Injectable } from '@angular/core';
import { ValidationError } from '../../domain/errors/validation.error';
import { WsRequest } from '../../runtime/dto/ws-request.dto';

@Injectable({
  providedIn: 'root'
})
export class MessageParser {
  parse(raw: string): WsRequest {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new ValidationError('Invalid JSON payload', { original: this.toErrorMessage(err) });
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new ValidationError('Message must be a JSON object');
    }

    const candidate = parsed as { type?: unknown; requestId?: unknown; payload?: unknown };
    if (typeof candidate.type !== 'string' || candidate.type.length === 0) {
      throw new ValidationError('Message type must be a non-empty string');
    }

    let requestId: string | number | undefined;
    if (typeof candidate.requestId === 'string' || typeof candidate.requestId === 'number') {
      requestId = candidate.requestId;
    } else if (candidate.requestId !== undefined) {
      throw new ValidationError('requestId must be a string or number');
    }

    return {
      type: candidate.type,
      requestId,
      payload: candidate.payload
    };
  }

  private toErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return typeof err === 'string' ? err : 'unknown_error';
  }
}
