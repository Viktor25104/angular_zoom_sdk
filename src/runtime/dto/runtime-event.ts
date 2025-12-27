export interface RuntimeEvent {
  type: string;
  payload?: Record<string, unknown>;
}
