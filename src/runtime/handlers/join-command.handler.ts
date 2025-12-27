import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler';
import { WsRequest } from '../dto/ws-request.dto';
import { JoinMeetingUseCase } from '../use-cases/join-meeting.use-case';

@Injectable({
  providedIn: 'root'
})
export class JoinCommandHandler implements CommandHandler {
  readonly type = 'JOIN';

  constructor(private readonly useCase: JoinMeetingUseCase) {}

  handle(_: WsRequest): Promise<void> {
    return this.useCase.execute();
  }
}
