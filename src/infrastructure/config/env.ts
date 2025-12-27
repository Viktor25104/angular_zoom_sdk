import { EnvironmentProviders, InjectionToken, Provider, makeEnvironmentProviders } from '@angular/core';
import { LogLevel } from '../../domain/ports/logger.port';
import { APP_CONSTANTS } from './app.constants';

export interface ZoomCredentials {
  sdkKey: string;
  signature: string;
  meetingNumber: string;
  passWord: string;
  userName: string;
  userEmail?: string;
  tk?: string;
  zak?: string;
}

export interface ClientEnv {
  ws: {
    url: string;
    reconnect: {
      initialDelayMs: number;
      maxDelayMs: number;
    };
    handshakeTimeoutMs: number;
  };
  chat: {
    monitorIntervalMs: number;
    panelCloseTimeoutMs: number;
  };
  logging: {
    level: LogLevel;
  };
  zoom: Partial<ZoomCredentials>;
}

type RawClientEnv = Partial<{
  wsUrl: string;
  reconnectInitialDelayMs: number;
  reconnectMaxDelayMs: number;
  handshakeTimeoutMs: number;
  monitorIntervalMs: number;
  panelCloseTimeoutMs: number;
  logLevel: LogLevel;
  zoom: Partial<ZoomCredentials>;
}>;

interface ClientEnvWindow extends Window {
  __zoomEnv?: RawClientEnv;
}

const defaultEnv: ClientEnv = {
  ws: {
    url: APP_CONSTANTS.ws.defaultUrl,
    reconnect: {
      initialDelayMs: APP_CONSTANTS.ws.reconnect.initialDelayMs,
      maxDelayMs: APP_CONSTANTS.ws.reconnect.maxDelayMs
    },
    handshakeTimeoutMs: APP_CONSTANTS.ws.handshakeTimeoutMs
  },
  chat: {
    monitorIntervalMs: APP_CONSTANTS.chat.monitorIntervalMs,
    panelCloseTimeoutMs: APP_CONSTANTS.chat.panelCloseTimeoutMs
  },
  logging: {
    level: APP_CONSTANTS.logging.defaultLevel
  },
  zoom: {}
};

function readWindowEnv(): RawClientEnv {
  if (typeof window === 'undefined') {
    return {};
  }
  const candidate = (window as ClientEnvWindow)[APP_CONSTANTS.envWindowKey as '__zoomEnv'];
  if (!candidate || typeof candidate !== 'object') {
    return {};
  }
  return candidate;
}

function normalizeZoom(overrides: RawClientEnv['zoom']): Partial<ZoomCredentials> {
  if (!overrides || typeof overrides !== 'object') {
    return {};
  }
  return { ...overrides };
}

export function loadClientEnv(): ClientEnv {
  const overrides = readWindowEnv();
  return {
    ws: {
      url: overrides.wsUrl || defaultEnv.ws.url,
      reconnect: {
        initialDelayMs: overrides.reconnectInitialDelayMs ?? defaultEnv.ws.reconnect.initialDelayMs,
        maxDelayMs: overrides.reconnectMaxDelayMs ?? defaultEnv.ws.reconnect.maxDelayMs
      },
      handshakeTimeoutMs: overrides.handshakeTimeoutMs ?? defaultEnv.ws.handshakeTimeoutMs
    },
    chat: {
      monitorIntervalMs: overrides.monitorIntervalMs ?? defaultEnv.chat.monitorIntervalMs,
      panelCloseTimeoutMs: overrides.panelCloseTimeoutMs ?? defaultEnv.chat.panelCloseTimeoutMs
    },
    logging: {
      level: overrides.logLevel ?? defaultEnv.logging.level
    },
    zoom: {
      ...defaultEnv.zoom,
      ...normalizeZoom(overrides.zoom)
    }
  };
}

export const CLIENT_ENV = new InjectionToken<ClientEnv>('CLIENT_ENV');

export const CLIENT_ENV_PROVIDER: Provider = {
  provide: CLIENT_ENV,
  useFactory: () => loadClientEnv()
};

export function provideClientEnv(): EnvironmentProviders {
  return makeEnvironmentProviders([CLIENT_ENV_PROVIDER]);
}
