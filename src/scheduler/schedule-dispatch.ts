import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { ScheduleFireJob } from "../shared/types/queue";
import type { ScheduleRecord } from "../storage/repositories/schedules-repository";
import { parseSchedulePayload } from "./schedule-payload";

export async function enqueueScheduleFire(
  env: Env,
  schedule: ScheduleRecord,
  input: {
    scheduledTime: string;
    receivedAt: string;
  }
): Promise<ScheduleFireJob> {
  const job = createScheduleFireJob(schedule, input);
  await env.AGENT_QUEUE.send(job);
  return job;
}

export function createScheduleFireJob(
  schedule: ScheduleRecord,
  input: {
    scheduledTime: string;
    receivedAt: string;
  }
): ScheduleFireJob {
  const payload = parseSchedulePayload(schedule.payloadJson);
  const job: ScheduleFireJob = {
    type: "schedule.fire",
    eventId: createId("evt"),
    agentId: schedule.agentId,
    scheduleId: schedule.id,
    title: schedule.title ?? payload.title,
    text: payload.text,
    platform: schedule.platform ?? payload.platform,
    conversationId: schedule.conversationId ?? payload.conversationId,
    actorId: schedule.actorId ?? payload.actorId,
    actorRole: schedule.actorRole ?? payload.actorRole,
    modelProviderId: schedule.modelProviderId ?? payload.modelProviderId,
    modelId: schedule.modelId ?? payload.modelId,
    scheduledTime: input.scheduledTime,
    receivedAt: input.receivedAt
  };

  return job;
}
