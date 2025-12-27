import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { LoggerPort } from '../../domain/ports/logger.port';
import { LogBufferPort } from '../../domain/ports/log-buffer.port';
import { SchedulerPort } from '../../domain/ports/scheduler.port';
import { ZoomSdkPort } from '../../domain/ports/zoom-sdk.port';
import { DomDriverPort } from '../../domain/ports/dom-driver.port';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { ConsoleBufferService } from '../logging/console-buffer.service';
import { BrowserSchedulerService } from '../scheduler/browser-scheduler.service';
import { ZoomWebSdkService } from '../zoom/zoom-websdk.service';
import { DomDriverService } from '../dom/dom-driver.service';
import { CLIENT_ENV_PROVIDER } from './env';

export function provideInfrastructure(): EnvironmentProviders {
  return makeEnvironmentProviders([
    CLIENT_ENV_PROVIDER,
    {
      provide: LoggerPort,
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
    },
    {
      provide: DomDriverPort,
      useClass: DomDriverService
    }
  ]);
}
