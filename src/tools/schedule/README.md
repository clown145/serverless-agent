# Schedule Tools

Model-callable tools for future and recurring tasks.

The tool layer uses the same scheduler runtime as the WebUI and `/task` command:

- D1 `schedules` is the source of truth.
- Cloudflare Cron sweeps due tasks.
- Queue events deliver `schedule.fire` jobs to the Agent Durable Object.
- The normal agent runtime handles the scheduled text.

## Tools

- `schedule.create`: create a one-time or recurring task.
- `schedule.list`: list schedules for the current agent.
- `schedule.pause`: pause an active schedule.
- `schedule.resume`: resume a paused or failed schedule.
- `schedule.cancel`: cancel a schedule.
- `schedule.run_now`: enqueue a schedule immediately.

## Permissions

- Read operations require `schedule:read`.
- Mutations require `schedule:write` and level 3.

Recurring tasks are capped at a minimum interval of 300 seconds to avoid accidental high-frequency loops on the free tier.
