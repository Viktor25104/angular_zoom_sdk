import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler';
import { InitCommandHandler } from './init-command.handler';
import { JoinCommandHandler } from './join-command.handler';
import { SendCommandHandler } from './send-command.handler';
import { ParticipantsCommandHandler } from './participants-command.handler';
import { OpenParticipantsPanelHandler } from './open-participants-panel.handler';
import { LeaveMeetingHandler } from './leave-meeting.handler';
import { CommandError } from '../../domain/errors/command.error';
import { WsRequest } from '../dto/ws-request.dto';

@Injectable({
  providedIn: 'root'
})
export class CommandDispatcher {
  private readonly handlers = new Map<string, CommandHandler>();

  constructor(
    initHandler: InitCommandHandler,
    joinHandler: JoinCommandHandler,
    sendHandler: SendCommandHandler,
    participantsHandler: ParticipantsCommandHandler,
    openPanelHandler: OpenParticipantsPanelHandler,
    leaveHandler: LeaveMeetingHandler
  ) {
    this.register(initHandler);
    this.register(joinHandler);
    this.register(sendHandler);
    this.register(participantsHandler);
    this.register(openPanelHandler);
    this.register(leaveHandler);
  }

  async dispatch(request: WsRequest): Promise<{ type: string; payload?: unknown }> {
    const handler = this.handlers.get(request.type);
    if (!handler) {
      throw new CommandError('command_unknown', `Unknown command: ${request.type}`);
    }
    const payload = await handler.handle(request);
    return {
      type: handler.type,
      payload
    };
  }

  private register(handler: CommandHandler): void {
    this.handlers.set(handler.type, handler);
  }
}
