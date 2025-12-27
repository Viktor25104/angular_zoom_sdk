# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, with Angular bootstrap logic in `src/main.ts` and the Zoom Meeting SDK integration concentrated in `src/app/app.ts` plus supporting config in `src/app/app.config.ts`. Shared styles belong in `src/styles.css`, and browser polyfills or flags belong in `src/zone-flags.ts`. Place static assets or configuration JSON under `public/`; the Angular CLI copies that folder during builds. Store runtime credentials in `public/zoom-config.js` with required fields (`sdkKey`, `signature`, `meetingNumber`, `passWord`, `userName`) and optional keys (`zak` for host/authorized mode, `tk` + `userEmail` for registered attendees). Generated output resides in `dist/ZoomSdk/browser` - treat it as read-only and rebuild instead of editing compiled files.

## Build, Test, and Development Commands
- `npm install` - sync dependencies defined in `package-lock.json`; rerun after branch switches.
- `npm start` - serve the app locally on the default Angular dev server with live reload.
- `npm run build` - produce an optimized production bundle into `dist/ZoomSdk/browser`.
- `npm run watch` - run an incremental development build that recompiles on file save.
- `npm test` - execute `ng test`, which hooks into the configured Vitest/Jasmine test runner.

## Coding Style & Naming Conventions
Follow the Angular CLI defaults: TypeScript, HTML, and CSS files use two-space indentation and PascalCase class names. Components, services, and helpers live in feature folders inside `src/app/`; use kebab-case filenames such as `meeting-controls.component.ts`. Prettier is configured for 100-character lines and single quotes, so run `npx prettier --write .` before committing if you touched formatting-sensitive files. Favor Angular template syntax over manual DOM access, and keep Zoom SDK adapters typed with explicit interfaces.

## Testing Guidelines
Store unit tests alongside their subjects as `*.spec.ts` files; co-locate them with the feature code for easier maintenance. `npm test` launches the Angular CLI runner, so keep tests deterministic and avoid hitting live Zoom services - mock SDK responses instead. Target at least 80% statement coverage for new modules; add regression cases whenever you fix a bug. Use descriptive test names such as `should_join_meeting_with_signature` to surface the behavior under test.

## Commit & Pull Request Guidelines
Git history currently uses short, lowercase summaries (e.g., `initial commit`); continue writing imperative subjects under 72 characters and describe what the change does, not how. Reference related issues in the body using `Closes #123` when applicable, and mention any Zoom credential updates or configuration changes explicitly. Pull requests should include a short walkthrough, screenshots or console output for UI-affecting changes, and reproduction notes for bug fixes. Request at least one review, ensure `npm test` and `npm run build` pass locally, and avoid merging compiled artifacts from `dist/`.
