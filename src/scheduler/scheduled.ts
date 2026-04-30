import { createId } from "../shared/ids";
import { nowIso } from "../shared/time";
import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";

export async function handleScheduled(
  controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  const agentId = env.DEFAULT_AGENT_ID ?? "default";
  const job: QueueMessageBody = {
    type: "schedule.tick",
    eventId: createId("evt"),
    agentId,
    scheduledTime: new Date(controller.scheduledTime).toISOString(),
    receivedAt: nowIso()
  };

  await env.AGENT_QUEUE.send(job);
}
