import { Injectable } from '@angular/core';
import { CommandHandler } from './command-handler';
import { WsRequest } from '../dto/ws-request.dto';
import { SendChatUseCase } from '../use-cases/send-chat.use-case';

@Injectable({
  providedIn: 'root'
})
export class SendCommandHandler implements CommandHandler {
  readonly type = 'SEND';

  constructor(private readonly useCase: SendChatUseCase) {}

  handle(request: WsRequest): Promise<void> {
    return this.useCase.execute(request.payload);
  }
}
