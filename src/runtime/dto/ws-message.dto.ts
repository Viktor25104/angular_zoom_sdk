export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export interface WsCommand<T = unknown> {
  type: string;
  payload?: T;
}
