import './zone-flags';

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/**
 * Bootstraps the standalone Zoom host component with the configured Angular providers.
 */
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
