# Scheduler Runtime

Schedules let the agent run future or recurring tasks without a user message.

## Data Model

Schedules are stored in D1:

```text
schedules.id
schedules.agent_id
schedules.status
schedules.due_at
schedules.interval_seconds
schedules.payload_json
schedules.last_run_at
```

The payload is currently:

```json
{
  "text": "/skill reader /read /workspace/notes/a.md",
  "conversationId": "admin:schedule"
}
```

`conversationId` is optional. If omitted, the runtime uses `admin:schedule`.

## Admin API

Create a one-time schedule:

```bash
curl -sS http://localhost:8787/admin/schedules \
  -H 'content-type: application/json' \
  -d '{"text":"/ping","delaySeconds":60}'
```

Create a recurring schedule:

```bash
curl -sS http://localhost:8787/admin/schedules \
  -H 'content-type: application/json' \
  -d '{"text":"/ping","delaySeconds":60,"intervalSeconds":3600}'
```

List schedules:

```bash
curl -sS http://localhost:8787/admin/schedules
```

Cancel a schedule:

```bash
curl -sS -X DELETE http://localhost:8787/admin/schedules/sch_...
```

## Model Tools

The agent can create and manage schedules through built-in tools:

- `schedule.create`: create one-time or recurring tasks.
- `schedule.list`: inspect schedules for the current agent.
- `schedule.pause`, `schedule.resume`, `schedule.cancel`: lifecycle controls.
- `schedule.run_now`: enqueue an existing schedule immediately.

These tools use the current actor and conversation by default, so a task created from Telegram will normally fire back into the same Telegram conversation. Read access requires `schedule:read`; mutations require `schedule:write` and level 3.

## Cron Sweep

Cloudflare Cron calls the scheduled handler. The handler:

1. Finds active schedules with `due_at <= scheduledTime`.
2. Sends a `schedule.fire` queue event for each due schedule.
3. Marks one-time schedules as `completed`.
4. Moves recurring schedules to their next `due_at`.
5. Writes a `cron` heartbeat.

Queue delivery is asynchronous, so a schedule may be marked dispatched before the resulting run finishes.

## Execution

`schedule.fire` is delivered to the Agent Durable Object. The runtime converts it into an internal admin message:

```text
platform: admin
sender: scheduler
rawRef: schedule:{schedule_id}
scheduleId: {schedule_id}
```

The normal agent runtime then handles the task. Runs triggered by schedules store `schedule_id` in the `runs` table.

## Heartbeats

Heartbeat sources:

- `cron`: cron sweep ran and dispatched due schedules.
- `schedule-fire`: a schedule event reached the Agent Durable Object.
- `durable-object`: schedule tick reached the Durable Object.

List them with:

```bash
curl -sS http://localhost:8787/admin/heartbeats
```
