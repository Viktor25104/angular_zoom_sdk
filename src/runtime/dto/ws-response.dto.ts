export interface WsResponse {
  type: string;
  ok: boolean;
  requestId?: string | number;
  payload?: unknown;
  error?: WsResponseError;
}

export interface WsResponseError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
