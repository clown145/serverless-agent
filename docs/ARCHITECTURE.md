# Architecture Overview

## Background

`serverless-agent` models an agent as a recoverable serverless state machine. It does not depend on a resident process, local disk state, or in-process queues.

The runtime is built on Cloudflare Workers, Queues, Durable Objects, D1, KV, and object storage.

## Responsibilities

The architecture is split across explicit runtime boundaries:

- Receive platform and admin input.
- Normalize input into internal messages.
- Buffer work through Cloudflare Queues.
- Process one agent's work serially through a Durable Object.
- Execute the platform-neutral agent loop.
- Run tool calls through permission and audit boundaries.
- Store structured state in D1 and larger content in object storage.

## Non-Goals

The core runtime does not:

- Execute arbitrary shell commands.
- Depend on a real writable filesystem.
- Expose platform tokens or provider secrets directly to the model.
- Keep business state only in memory.
- Handle platform protocol details inside `src/core`.

## Runtime Topology

```text
Telegram / QQ / WeCom / Weixin OC / WebUI / Admin
        |
        v
Cloudflare Worker
  - HTTP routes
  - webhook verification
  - event normalization
  - queue dispatch
        |
        v
Cloudflare Queue
        |
        v
Agent Durable Object
  - per-agent mailbox
  - serial event processing
  - alarms and recovery
        |
        v
Agent Core
  - context assembly
  - model provider dispatch
  - tool-call loop
        |
        v
Tools / Storage / Scheduler
  - permission checks
  - VFS
  - platform outbound
  - D1 / KV / object storage
```

## Module Boundaries

| Module      | Path              | Responsibility                                                                        |
| ----------- | ----------------- | ------------------------------------------------------------------------------------- |
| Worker      | `src/worker`      | HTTP routes, webhook verification, admin API, Queue, and Cron entrypoints.            |
| Adapters    | `src/adapters`    | Platform payload parsing, normalization, and outbound protocol calls.                 |
| Agents      | `src/agents`      | Durable Object coordination, mailbox state, alarms, and recovery.                     |
| Core        | `src/core`        | Platform-neutral agent loop, context preparation, model dispatch, and tool-call flow. |
| Tools       | `src/tools`       | Model-callable tools, schemas, permissions, and side-effect execution.                |
| Storage     | `src/storage`     | D1 repositories, object storage abstraction, and persistence boundaries.              |
| Scheduler   | `src/scheduler`   | Future tasks, recurring tasks, Cron sweeps, and heartbeats.                           |
| Permissions | `src/permissions` | Permission policy resolution and pending action execution.                            |

## Failure Model

The runtime assumes platform requests, Queue delivery, model calls, and tool calls can fail independently.

Primary recovery mechanisms:

- Queue retry buffers transient ingress failures.
- The Agent Durable Object serializes events per agent.
- Mailbox event state provides a bounded idempotency window and is cleaned after its retention period.
- Runs and run steps are persisted in D1 for inspection and recovery.
- High-risk tool calls can stop at pending confirmation before executing side effects.
- VFS blob writes use best-effort cleanup when D1 metadata writes fail after object storage writes.

## Related Documents

- [Runtime flow](architecture/RUNTIME_FLOW.md)
- [Storage model](architecture/STORAGE_MODEL.md)
- [Tools and boundaries](architecture/TOOLS_AND_BOUNDARIES.md)
- [Failure and concurrency](architecture/FAILURE_AND_CONCURRENCY.md)
- [Platform integrations](architecture/PLATFORM_INTEGRATIONS.md)
