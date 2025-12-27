import { LogLevel } from '../../domain/ports/logger.port';

export const APP_CONSTANTS = {
  ws: {
    defaultUrl: 'ws://localhost:8081',
    reconnect: {
      initialDelayMs: 1000,
      maxDelayMs: 15000
    },
    handshakeTimeoutMs: 3000
  },
  logging: {
    defaultLevel: 'info' as LogLevel
  },
  chat: {
    monitorIntervalMs: 1500,
    panelCloseTimeoutMs: 3000
  },
  zoom: {
    configScript: 'env.js'
  },
  envWindowKey: '__zoomEnv'
} as const;

export type AppConstants = typeof APP_CONSTANTS;
