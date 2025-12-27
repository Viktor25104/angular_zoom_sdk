import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketGatewayService } from './websocket-gateway.service';
import { MessageParser } from './message-parser';
import { CommandDispatcher } from '../../runtime/handlers/command-dispatcher';
import { ResponseFormatter } from './response-formatter';
import { LoggerPort } from '../../domain/ports/logger.port';
import { MeetingApplicationService } from '../../runtime/application-service';
import { LogEntry } from '../../domain/ports/log-buffer.port';

@Injectable({
  providedIn: 'root'
})
export class WebsocketCommandController {
  private readonly unsubscribeMessage: () => void;
  private readonly unsubscribeOpen: () => void;
  private readonly unsubscribeClose: () => void;
  private readonly runtimeEvents: Subscription;

  constructor(
    private readonly gateway: WebsocketGatewayService,
    private readonly parser: MessageParser,
    private readonly dispatcher: CommandDispatcher,
    private readonly formatter: ResponseFormatter,
    private readonly meeting: MeetingApplicationService,
    private readonly logger: LoggerPort
  ) {
    this.unsubscribeMessage = this.gateway.onMessage((raw) => this.handleRawMessage(raw));
    this.unsubscribeOpen = this.gateway.onOpen(() => this.sendHello());
    this.unsubscribeClose = this.gateway.onClose(() => this.handleDisconnect());
    this.runtimeEvents = this.meeting.events$().subscribe((event) => {
      this.gateway.send(this.formatter.event(event));
    });
  }

  private sendHello(): void {
    this.logger.debug('ws_hello_send');
    this.gateway.send({ type: 'HELLO_FROM_ANGULAR' });
  }

  private handleDisconnect(): void {
    this.logger.warn('ws_controller_disconnected');
  }

  private async handleRawMessage(raw: string): Promise<void> {
    let request;
    try {
      request = this.parser.parse(raw);
    } catch (err) {
      this.logger.error('ws_message_parse_failed', { error: err });
      const response = this.formatter.error('INVALID_MESSAGE', err);
      this.gateway.send(response);
      return;
    }

    try {
      const result = await this.dispatcher.dispatch(request);
      const response = this.formatter.success(result.type, result.payload, request.requestId);
      this.gateway.send(response);
    } catch (err) {
      this.logger.error('ws_command_failed', {
        type: request.type,
        requestId: request.requestId,
        message: err instanceof Error ? err.message : 'unknown_error'
      });
      const logs = this.formatLogs(this.meeting.getLogs());
      const response = this.formatter.error(request.type, err, request.requestId, {
        logs
      });
      this.gateway.send(response);
    }
  }

  private formatLogs(entries: LogEntry[]): string[] {
    return entries.map((entry) => {
      const message = entry.message
        .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
        .join(' ');
      return `[${entry.timestamp}][${entry.level.toUpperCase()}] ${message}`;
    });
  }
}
