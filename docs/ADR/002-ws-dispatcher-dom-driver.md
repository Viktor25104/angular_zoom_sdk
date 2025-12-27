# ADR-002: WebSocket Command Dispatcher & DOM Driver

## Status

Accepted – 2025-12-27

## Context

After introducing the DRAI foundation, the runtime still parsed JSON manually, routed commands via a massive switch, and accessed the DOM through scattered selectors. This made the websocket protocol brittle (no validation/consistent responses) and tightly coupled Zoom automation to `document.querySelector()`, hindering testability and future refactors.

## Decision

- Introduce `WsRequest`/`WsResponse` DTOs, a `MessageParser`, and a `ResponseFormatter` to validate inbound payloads and emit predictable `{ type, ok, requestId?, payload?, error? }` responses.
- Add `CommandDispatcher` plus per-command handlers/use-cases so runtime orchestration follows the command → handler → use-case → port pipeline.
- Extend domain ports with `DomDriverPort`; implement `DomDriverService` that centralizes every selector and encapsulates polling/wait logic.
- Update `MeetingApplicationService` to depend on ports (`ZoomSdkPort`, `DomDriverPort`, `SchedulerPort`, `LogBufferPort`, `LoggerPort`), emit runtime events, and surface buffered logs for troubleshooting.
- Wire everything together via `WebsocketCommandController` so the Angular app remains a thin UI shell.

## Consequences

- Websocket clients now receive deterministic error payloads (with log excerpts) and structured success responses, improving observability.
- DOM operations can be swapped or tested independently because selectors/timing concerns live in `DomDriverService`.
- Runtime no longer imports infrastructure classes directly, keeping dependency directions aligned with DRAI.
