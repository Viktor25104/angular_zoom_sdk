import { Injectable, computed } from '@angular/core';
import { WebsocketGatewayService } from '../../api/websocket/websocket-gateway.service';
import { MeetingApplicationService } from '../../runtime/application-service';
import { WsStatus } from '../../runtime/dto/ws-message.dto';

@Injectable({
  providedIn: 'root'
})
export class WsControlService {
  readonly status = computed<WsStatus>(() => this.gateway.status());

  constructor(
    private readonly gateway: WebsocketGatewayService,
    private readonly runtime: MeetingApplicationService
  ) {
    this.runtime.start();
  }
}
