# Contributing

## Local Setup

1. Install Node 20.x and npm 11.x.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`, edit the websocket + Zoom credentials, and mirror them into `public/env.js` (see `public/env.example.js`).
4. Start the Angular dev server via `npm start`.

## Coding Standards

- Follow the DRAI folder layout – keep domain pure, runtime isolated from infrastructure, and UI razor-thin.
- TypeScript uses the Prettier defaults checked into `package.json` (100 chars, single quotes).
- Prefer explicit interfaces/value objects; avoid `any`.
- Run `npm run build` + `npm test` before submitting PRs. (Linting via ESLint will be added after the runtime split lands.)

## Pull Requests

- Use imperative, concise commit subjects (<= 72 chars).
- Provide a short walkthrough, screenshots, or console output for any UI-affecting change.
- Reference issues (e.g., `Closes #123`) and describe Zoom credential implications if applicable.
- Ensure test + build commands pass locally.
