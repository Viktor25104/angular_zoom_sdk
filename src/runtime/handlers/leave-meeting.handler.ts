import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler';
import { WsRequest } from '../dto/ws-request.dto';
import { LeaveMeetingUseCase } from '../use-cases/leave-meeting.use-case';

@Injectable({
  providedIn: 'root'
})
export class LeaveMeetingHandler implements CommandHandler {
  readonly type = 'LEAVE_MEETING';

  constructor(private readonly useCase: LeaveMeetingUseCase) {}

  handle(_: WsRequest): Promise<void> {
    return this.useCase.execute();
  }
}
