import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

/**
 * Centralized Angular application configuration shared across the standalone bootstrap.
 * Adds global error listeners so unexpected Zoom SDK failures surface in the console.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
  ]
};
