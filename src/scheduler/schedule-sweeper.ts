import { nowIso } from "../shared/time";
import type { Env } from "../shared/types/env";
import { upsertHeartbeat } from "../storage/repositories/heartbeats-repository";
import {
  countDueSchedules,
  listDueSchedules,
  markScheduleDispatched
} from "../storage/repositories/schedules-repository";
import type { ScheduleRecord } from "../storage/repositories/schedules-repository";
import { enqueueScheduleFire } from "./schedule-dispatch";
import { computeNextDueAfterDispatch } from "./schedule-next-due";

export const DEFAULT_SCHEDULE_SWEEP_BATCH_SIZE = 100;
export const DEFAULT_SCHEDULE_SWEEP_MAX_DISPATCHES = 1_000;

export type SweepResult = {
  scannedAt: string;
  dispatched: number;
  remainingDue: number;
};

export async function sweepDueSchedules(env: Env, scheduledTime: string): Promise<SweepResult> {
  const scannedAt = nowIso();
  const limits = resolveSweepLimits(env);
  let dispatched = 0;

  while (dispatched < limits.maxDispatches) {
    const limit = Math.min(limits.batchSize, limits.maxDispatches - dispatched);
    const due = await listDueSchedules(env.AGENT_DB, scheduledTime, limit);
    if (due.length === 0) {
      break;
    }

    for (const schedule of due) {
      await dispatchDueSchedule(env, schedule, scheduledTime, scannedAt);
      dispatched += 1;
    }
  }

  const remainingDue = await countDueSchedules(env.AGENT_DB, scheduledTime);
  await upsertHeartbeat(env.AGENT_DB, {
    agentId: env.DEFAULT_AGENT_ID ?? "default",
    source: "cron",
    status: remainingDue > 0 ? "degraded" : "ok",
    lastSeenAt: scannedAt,
    detailsJson: JSON.stringify({ scheduledTime, dispatched, remainingDue })
  });

  return { scannedAt, dispatched, remainingDue };
}

async function dispatchDueSchedule(
  env: Env,
  schedule: ScheduleRecord,
  scheduledTime: string,
  scannedAt: string
): Promise<void> {
  await enqueueScheduleFire(env, schedule, { scheduledTime, receivedAt: scannedAt });
  const nextDueAt = computeNextDueAfterDispatch(schedule, scheduledTime);
  await markScheduleDispatched(env.AGENT_DB, schedule, scannedAt, nextDueAt);
}

function resolveSweepLimits(env: Env): { batchSize: number; maxDispatches: number } {
  const batchSize = parsePositiveInt(
    env.SCHEDULE_SWEEP_BATCH_SIZE,
    DEFAULT_SCHEDULE_SWEEP_BATCH_SIZE
  );
  const maxDispatches = parsePositiveInt(
    env.SCHEDULE_SWEEP_MAX_DISPATCHES,
    DEFAULT_SCHEDULE_SWEEP_MAX_DISPATCHES
  );

  return {
    batchSize: Math.min(batchSize, maxDispatches),
    maxDispatches
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
