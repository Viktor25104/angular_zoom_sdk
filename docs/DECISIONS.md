# Decision Log

| ID      | Title                               | Status   | Summary |
| ------- | ----------------------------------- | -------- | ------- |
| ADR-001 | DRAI foundation & env bridge        | Accepted | Introduced the domain/runtime/api/infrastructure folder structure, centralized env + logging, and wired Angular DI to consume the new abstractions. |
| ADR-002 | WS command dispatcher & DOM driver  | Accepted | Added parser/formatter + handler/use-case dispatcher for the websocket protocol and isolated DOM access behind a dedicated driver + selectors module. |
