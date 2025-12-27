import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler';
import { WsRequest } from '../dto/ws-request.dto';
import { OpenParticipantsPanelUseCase } from '../use-cases/open-participants-panel.use-case';

@Injectable({
  providedIn: 'root'
})
export class OpenParticipantsPanelHandler implements CommandHandler {
  readonly type = 'OPEN_PARTICIPANTS_PANEL';

  constructor(private readonly useCase: OpenParticipantsPanelUseCase) {}

  handle(_: WsRequest): Promise<void> {
    return this.useCase.execute();
  }
}
