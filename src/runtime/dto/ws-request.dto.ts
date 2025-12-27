export interface WsRequest<T = unknown> {
  type: string;
  requestId?: string | number;
  payload?: T;
}
