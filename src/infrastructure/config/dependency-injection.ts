import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { LoggerPort } from '../../domain/ports/logger.port';
import { LogBufferPort } from '../../domain/ports/log-buffer.port';
import { SchedulerPort } from '../../domain/ports/scheduler.port';
import { ZoomSdkPort } from '../../domain/ports/zoom-sdk.port';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { ConsoleBufferService } from '../logging/console-buffer.service';
import { BrowserSchedulerService } from '../scheduler/browser-scheduler.service';
import { ZoomWebSdkService } from '../zoom/zoom-websdk.service';
import { CLIENT_ENV_PROVIDER } from './env';

export const LOGGER_PORT = new InjectionToken<LoggerPort>('LOGGER_PORT');

export function provideInfrastructure(): EnvironmentProviders {
  return makeEnvironmentProviders([
    CLIENT_ENV_PROVIDER,
    {
      provide: LOGGER_PORT,
      useClass: StructuredLoggerService
    },
    {
      provide: LogBufferPort,
      useClass: ConsoleBufferService
    },
    {
      provide: ZoomSdkPort,
      useClass: ZoomWebSdkService
    },
    {
      provide: SchedulerPort,
      useClass: BrowserSchedulerService
    }
  ]);
}
