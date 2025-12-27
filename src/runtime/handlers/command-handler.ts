import { WsRequest } from '../dto/ws-request.dto';

export interface CommandHandler {
  readonly type: string;
  handle(request: WsRequest): Promise<unknown>;
}
