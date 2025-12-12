# Zoom Meeting SDK Host

## Overview
ZoomSdk is a lightweight Angular 21 application that boots the Zoom Meeting SDK inside a controlled browser shell. The app relies on a runtime configuration object (`window.__ZOOM_CONFIG__`) so credentials never ship inside the compiled bundle. This README walks you through local setup, configuration, testing, and deployment so you can focus on integrating Zoom features quickly and safely.

## Key Features
- **Angular standalone bootstrap** with minimal dependencies and strict TypeScript typing.
- **Runtime Zoom wiring** that initializes and joins meetings once the DOM is ready.
- **Global error visibility** via Angular's browser error listeners and structured console logging.
- **Lightning-fast iteration** thanks to `ng serve`, incremental builds, and Vitest-powered unit tests.

## Project Structure
- `src/app/app.ts` - standalone root component that initializes and joins Zoom meetings.
- `src/app/app.config.ts` - application-wide providers such as global error listeners.
- `src/main.ts` - bootstraps the standalone component after loading `zone-flags`.
- `src/zone-flags.ts` - applies the minimum Zone.js tweaks required by the Zoom SDK.
- `public/zoom-config.js` - runtime credentials injected into `window.__ZOOM_CONFIG__`.
- `dist/ZoomSdk/browser` - generated output; never edit files here, rerun the build instead.

## Prerequisites
- Node.js 20+ and npm 10+ (the repo uses `npm@11.6.2`).
- Zoom Meeting SDK credentials (SDK Key, signature, meeting number, passcode, and ZAK token).
- Optional: Chrome/Edge for local testing and a Zoom account with the meeting enabled.

## Quick Start
```bash
npm install
npm start
```
Visit `http://localhost:4200/` and update `public/zoom-config.js` with your own credentials before reloading. The Angular dev server watches the configuration file, so changes are picked up instantly.

## Runtime Configuration
The Zoom SDK pulls every sensitive value from `public/zoom-config.js` at runtime. Provide all required fields:
```js
window.__ZOOM_CONFIG__ = {
  sdkKey: 'YOUR_SDK_KEY',
  signature: 'JWT_GENERATED_ON_YOUR_BACKEND', // role 1 to start, 0 to join
  meetingNumber: '123456789',
  passWord: 'secure-passcode',
  userName: 'Bot',
  userEmail: '', // only fill when tk is set
  tk: '',        // registrant token for meetings with required registration
  zak: ''        // host/authorized-user ZAK token (optional)
};
```
`signature`, `meetingNumber`, `passWord`, and `userName` are always required. Provide `tk` **and** `userEmail` when the meeting enforces registration; provide `zak` when you start the meeting or when the host requires authenticated joins. Never commit production credentials. For automated deployments, inject the same structure via an inline `<script>` tag or a server-side template that writes to `window.__ZOOM_CONFIG__`.

## Development & Testing Workflow
- `npm start` - launches the Angular dev server with live reload and verbose logging.
- `npm run build` - outputs a production bundle to `dist/ZoomSdk/browser`.
- `npm run watch` - rebuilds incrementally using the development configuration.
- `npm test` - runs unit tests through Angular's Vitest-powered harness.
Keep tests deterministic by mocking Zoom SDK responses rather than calling live services.

## Build & Deployment
Execute `npm run build` and host the generated `dist/ZoomSdk/browser` folder on any static server (Vercel, Azure Static Web Apps, S3, etc.). Ensure your deployment pipeline also provides the correct `window.__ZOOM_CONFIG__` values - either by copying `public/zoom-config.js` or by injecting environment-specific values during release.

## Documentation & Support
Refer to `AGENTS.md` for contributor expectations, coding standards, and pull-request requirements. If you add new modules or feature areas, extend both this README and in-line code documentation so future maintainers understand how Zoom SDK credentials flow through the application.
