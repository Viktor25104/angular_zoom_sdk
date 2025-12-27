# Zoom SDK Angular – DRAI Overview

The app follows the DRAI (Domain, Runtime, API, Infrastructure) layering model. Domain defines pure contracts, runtime orchestrates use-cases, API handles delivery/protocol, and infrastructure provides adapters (Zoom SDK, DOM, logging, websocket, scheduler).

## Domain

- `src/domain/entities` – meeting/chat aggregate roots and DTO shape.
- `src/domain/value-objects` – value semantics (meeting number, message body, etc.).
- `src/domain/errors` – typed failures (`DomainError`, `ValidationError`, `SocketError`, `ZoomError`, `DomError`, `CommandError`).
- `src/domain/ports` – abstract ports consumed by runtime (`LoggerPort`, `ZoomSdkPort`, `DomDriverPort`, `SchedulerPort`, `LogBufferPort`).

## Runtime (Application)

- `src/runtime/application-service.ts` – orchestrates Zoom/DOM actions and emits runtime events via RxJS.
- `src/runtime/use-cases` – business actions (init meeting, join, send chat, fetch participants, open panel, leave).
- `src/runtime/handlers` – map WS commands to use-cases via `CommandDispatcher`.
- `src/runtime/dto` – WS request/response contracts plus runtime event models.
- `src/runtime/policies/mappers` – reserved for additional orchestration logic (retry/backoff, DTO transforms).

## API (Delivery)

- `src/api/websocket/websocket-gateway.service.ts` – owns WebSocket lifecycle (connect/disconnect/status).
- `src/api/websocket/message-parser.ts` – validates inbound JSON and enforces `{type, requestId?, payload}` contract.
- `src/api/websocket/response-formatter.ts` – produces `{type, ok, requestId?, payload?, error?}` responses.
- `src/api/websocket/websocket-command.controller.ts` – ties together gateway, parser, dispatcher, meeting events.
- `src/api/ui` – Angular shell; `WsControlService` remains thin and consumes only gateway status.

## Infrastructure

- `src/infrastructure/config` – env loader (`CLIENT_ENV`), app constants, DI wiring for all ports.
- `src/infrastructure/logging` – console buffer adapter + structured logger implementation.
- `src/infrastructure/websocket` – (gateway currently lives in API; reconnect policies belong here for future work).
- `src/infrastructure/zoom` – Zoom Web SDK wrapper (prepare/init/join).
- `src/infrastructure/dom` – selectors + `DomDriverService` (centralizes DOM queries + timeouts).
- `src/infrastructure/scheduler` – browser timer adapter so runtime can be tested.

## Config + Env

- `.env.example` – template for `.env.local`; use `public/env.js` (copied from `public/env.example.js`) to expose runtime overrides via `window.__zoomEnv`.
- `src/infrastructure/config/env.ts` – merges defaults with overrides (ws url, timeouts, log level, Zoom credentials).
- `src/infrastructure/config/app.constants.ts` – canonical defaults reused cross-layer.

## Logging & Observability

- Structured logging goes through `LoggerPort`. Severity filtering honors env log level.
- Critical lifecycle events (CONNECT/DISCONNECT/ERROR, INIT/JOIN/SEND/LEAVE, DOM waits, Zoom init/join) emit typed logs for remote diagnostics.
- `LogBufferPort` retains console output; failures return logs via WS error payloads for easier triage.

## Dependency Rules

- Domain is pure and imported everywhere.
- Runtime depends only on domain + runtime modules (no direct infrastructure imports).
- API depends on runtime + domain (never infrastructure).
- Infrastructure implements domain ports (no runtime/api imports).
- UI interacts with runtime through injected services; it never references infrastructure.
