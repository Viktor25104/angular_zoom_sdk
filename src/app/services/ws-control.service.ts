import { Injectable, computed } from '@angular/core';
import { WebsocketGatewayService } from '../../api/websocket/websocket-gateway.service';
import { WebsocketCommandController } from '../../api/websocket/websocket-command.controller';
import { WsStatus } from '../../runtime/dto/ws-message.dto';

@Injectable({
  providedIn: 'root'
})
export class WsControlService {
  readonly status = computed<WsStatus>(() => this.gateway.status());

  constructor(
    private readonly gateway: WebsocketGatewayService,
    private readonly _controller: WebsocketCommandController
  ) {}
}
