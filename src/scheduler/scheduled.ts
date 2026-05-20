import { connectConfiguredQqOfficialGateways } from "../adapters/qq/official/keepalive";
import { createId } from "../shared/ids";
import { nowIso } from "../shared/time";
import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import { sweepDueSchedules } from "./schedule-sweeper";

export async function handleScheduled(
  controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  const scheduledTime = new Date(controller.scheduledTime).toISOString();
  await sweepDueSchedules(env, scheduledTime);
  await connectConfiguredQqOfficialGateways(env).catch(() => undefined);

  const agentId = env.DEFAULT_AGENT_ID ?? "default";
  const job: QueueMessageBody = {
    type: "schedule.tick",
    eventId: createId("evt"),
    agentId,
    scheduledTime,
    receivedAt: nowIso()
  };

  await env.AGENT_QUEUE.send(job);
}
