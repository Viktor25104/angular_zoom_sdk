# Zoom SDK Angular – DRAI Overview

The app follows the DRAI (Domain, Runtime, API, Infrastructure) layering model.

## Domain

- `src/domain/entities` – meeting/chat aggregate roots and DTO shape.
- `src/domain/value-objects` – value semantics (meeting number, message body, etc.).
- `src/domain/errors` – typed failures (`DomainError`, `SocketError`, `ZoomError`, etc.).
- `src/domain/ports` – abstract ports consumed by runtime (logger, websocket, zoom gateway).

## Runtime (Application)

- `src/runtime/use-cases` – business actions (init meeting, send chat, monitor chat, teardown).
- `src/runtime/handlers` – translate WS commands into use-case invocations.
- `src/runtime/policies` – retry/backoff strategies (e.g., websocket reconnect).
- `src/runtime/mappers` / `dto` – mapping between raw payloads and domain objects.
- `src/runtime/application-service.ts` – orchestrates port wiring for use-cases.

## API (Delivery)

- `src/api/websocket` – gateway, parser, formatter for WS protocol.
- `src/api/ui` – the Angular host plus thin presenter components.

## Infrastructure

- `src/infrastructure/config` – env loader, constants, DI wiring.
- `src/infrastructure/logging` – console buffer adapter + structured logger (`LoggerPort` impl).
- `src/infrastructure/zoom` – Zoom Web SDK wrapper (init/join/leave).
- `src/infrastructure/websocket` – client connection + reconnect policy adapters.
- `src/infrastructure/dom` / `chat` / `scheduler` – DOM drivers, chat automation, timers.

## Config + Env

- `.env.example` – template for `.env.local`.
- `public/env.example.js` – browser bootstrap for `window.__zoomEnv`.
- `src/infrastructure/config/env.ts` – merges defaults with runtime overrides and exposes the `CLIENT_ENV` injection token.
- `src/infrastructure/config/app.constants.ts` – canonical defaults/shared constants.

## Logging

Structured logging goes through the `LoggerPort` abstraction. The infrastructure layer currently provides a console-backed implementation with log-level filtering sourced from env. Critical lifecycle events will emit `CONNECT/DISCONNECT/INIT/JOIN/SEND` log entries to keep operational insight consistent between transports.

## Dependency Rules

- Domain is pure and imported everywhere.
- Runtime depends on domain + runtime only.
- API depends on runtime + domain (no infrastructure coupling).
- Infrastructure implements domain ports.
- UI never consumes infrastructure directly (interacts via runtime/application service).
