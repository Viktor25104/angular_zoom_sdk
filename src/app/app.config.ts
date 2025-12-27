import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideInfrastructure } from '../infrastructure/config/dependency-injection';

/**
 * Centralized Angular application configuration shared across the standalone bootstrap.
 * Adds global error listeners so unexpected Zoom SDK failures surface in the console.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideInfrastructure()
  ]
};
