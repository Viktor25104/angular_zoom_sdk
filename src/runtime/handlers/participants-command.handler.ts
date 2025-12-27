import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler';
import { WsRequest } from '../dto/ws-request.dto';
import { GetParticipantsUseCase } from '../use-cases/get-participants.use-case';

@Injectable({
  providedIn: 'root'
})
export class ParticipantsCommandHandler implements CommandHandler {
  readonly type = 'PARTICIPANTS';

  constructor(private readonly useCase: GetParticipantsUseCase) {}

  async handle(_: WsRequest): Promise<{ count: number }> {
    const count = await this.useCase.execute();
    return { count };
  }
}
