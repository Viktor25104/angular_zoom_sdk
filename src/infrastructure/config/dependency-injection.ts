import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { LoggerPort } from '../../domain/ports/logger.port';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { CLIENT_ENV_PROVIDER } from './env';

export const LOGGER_PORT = new InjectionToken<LoggerPort>('LOGGER_PORT');

export function provideInfrastructure(): EnvironmentProviders {
  return makeEnvironmentProviders([
    CLIENT_ENV_PROVIDER,
    {
      provide: LOGGER_PORT,
      useClass: StructuredLoggerService
    }
  ]);
}
