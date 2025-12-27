import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler';
import { InitMeetingUseCase } from '../use-cases/init-meeting.use-case';
import { WsRequest } from '../dto/ws-request.dto';

@Injectable({
  providedIn: 'root'
})
export class InitCommandHandler implements CommandHandler {
  readonly type = 'INIT';

  constructor(private readonly useCase: InitMeetingUseCase) {}

  handle(request: WsRequest): Promise<void> {
    return this.useCase.execute(request.payload);
  }
}
