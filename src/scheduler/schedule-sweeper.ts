import { nowIso } from "../shared/time";
import type { Env } from "../shared/types/env";
import { upsertHeartbeat } from "../storage/repositories/heartbeats-repository";
import {
  listDueSchedules,
  markScheduleDispatched
} from "../storage/repositories/schedules-repository";
import { enqueueScheduleFire } from "./schedule-dispatch";
import { computeNextDueAt } from "./schedule-time";

export type SweepResult = {
  scannedAt: string;
  dispatched: number;
};

export async function sweepDueSchedules(env: Env, scheduledTime: string): Promise<SweepResult> {
  const scannedAt = nowIso();
  const due = await listDueSchedules(env.AGENT_DB, scheduledTime);
  let dispatched = 0;

  for (const schedule of due) {
    await enqueueScheduleFire(env, schedule, { scheduledTime, receivedAt: scannedAt });
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
