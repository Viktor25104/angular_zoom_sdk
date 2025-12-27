# ADR-001: Establish DRAI Foundation

## Status

Accepted – 2025-12-27

## Context

The legacy Angular host used a monolithic `WsControlService` that managed websocket transport, Zoom SDK lifecycle, DOM automation, and logging with hard-coded constants. There was no formal separation between domain logic, runtime orchestration, API delivery, or infrastructure adapters. Configuration details (WS URL, log level, chat timing) were scattered across files and the lack of typed errors made it difficult to provide predictable responses to the websocket controller.

## Decision

- Create the canonical DRAI folder structure under `src/` plus shared docs (`docs/ARCHITECTURE.md`, `docs/DECISIONS.md`).
- Introduce `.env.example` and a browser bridge (`public/env.example.js`) tying into a new `src/infrastructure/config/env.ts` loader + Angular injection token (`CLIENT_ENV`).
- Define the domain error taxonomy and the `LoggerPort` abstraction.
- Move the console buffer adapter under `src/infrastructure/logging` and add a structured logger implementation with log-level filtering driven by env.
- Provide infrastructure wiring via `provideInfrastructure()` and register it in `app.config.ts`.

## Consequences

- The Angular UI now consumes the centralized `CLIENT_ENV` token to fetch the websocket URL (removing magic strings).
- Future commits can implement runtime use-cases and infrastructure adapters without further reshuffling of the project structure.
- Additional configs (Zoom credentials, scheduler settings) can flow through the same env bridge and remain testable.
