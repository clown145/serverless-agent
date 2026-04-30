import { createId } from "../shared/ids";
import { nowIso } from "../shared/time";
import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import { upsertHeartbeat } from "../storage/repositories/heartbeats-repository";
import {
  listDueSchedules,
  markScheduleDispatched
} from "../storage/repositories/schedules-repository";
import { parseSchedulePayload } from "./schedule-payload";
import { computeNextDueAt } from "./schedule-time";

export type SweepResult = {
  scannedAt: string;
  dispatched: number;
};

export async function sweepDueSchedules(
  env: Env,
  scheduledTime: string
): Promise<SweepResult> {
  const scannedAt = nowIso();
  const due = await listDueSchedules(env.AGENT_DB, scheduledTime);
  let dispatched = 0;

  for (const schedule of due) {
    const payload = parseSchedulePayload(schedule.payloadJson);
    const job: QueueMessageBody = {
      type: "schedule.fire",
      eventId: createId("evt"),
      agentId: schedule.agentId,
      scheduleId: schedule.id,
      text: payload.text,
      conversationId: payload.conversationId,
      scheduledTime,
      receivedAt: scannedAt
    };

    await env.AGENT_QUEUE.send(job);
    const nextDueAt = schedule.intervalSeconds
      ? computeNextDueAt(new Date(scannedAt), schedule.intervalSeconds)
      : undefined;

    await markScheduleDispatched(env.AGENT_DB, schedule, scannedAt, nextDueAt);
    dispatched += 1;
  }

  await upsertHeartbeat(env.AGENT_DB, {
    agentId: env.DEFAULT_AGENT_ID ?? "default",
    source: "cron",
    status: "ok",
    lastSeenAt: scannedAt,
    detailsJson: JSON.stringify({ scheduledTime, dispatched })
  });

  return { scannedAt, dispatched };
}
