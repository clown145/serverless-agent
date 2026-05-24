import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapScheduleRow,
  type CreateScheduleInput,
  type ScheduleRecord,
  type ScheduleRow,
  type ScheduleRunStatus
} from "./schedule-types";

export type {
  CreateScheduleInput,
  ScheduleRecord,
  ScheduleRunStatus,
  ScheduleStatus
} from "./schedule-types";

export async function createSchedule(
  db: D1Database,
  input: CreateScheduleInput
): Promise<ScheduleRecord> {
  const now = nowIso();
  const id = createId("sch");

  await db
    .prepare(
      `INSERT INTO schedules (
        id, agent_id, status, title, due_at, interval_seconds,
        platform, conversation_id, actor_id, actor_role,
        model_provider_id, model_id, max_attempts, attempt_count,
        retry_delay_seconds, recurrence_due_at, payload_json, execution_profile_json,
        created_at, updated_at
      ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.agentId,
      input.title ?? null,
      input.dueAt,
      input.intervalSeconds ?? null,
      input.platform ?? null,
      input.conversationId ?? null,
      input.actorId ?? null,
      input.actorRole ?? null,
      input.modelProviderId ?? null,
      input.modelId ?? null,
      input.maxAttempts ?? 1,
      input.retryDelaySeconds ?? 300,
      input.intervalSeconds ? input.dueAt : null,
      input.payloadJson,
      input.executionProfileJson ?? null,
      now,
      now
    )
    .run();

  return {
    id,
    agentId: input.agentId,
    status: "active",
    title: input.title,
    dueAt: input.dueAt,
    intervalSeconds: input.intervalSeconds,
    platform: input.platform,
    conversationId: input.conversationId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    modelProviderId: input.modelProviderId,
    modelId: input.modelId,
    maxAttempts: input.maxAttempts ?? 1,
    attemptCount: 0,
    retryDelaySeconds: input.retryDelaySeconds ?? 300,
    recurrenceDueAt: input.intervalSeconds ? input.dueAt : undefined,
    payloadJson: input.payloadJson,
    executionProfileJson: input.executionProfileJson,
    createdAt: now,
    updatedAt: now
  };
}

export async function listSchedules(db: D1Database, agentId?: string): Promise<ScheduleRecord[]> {
  const query = agentId
    ? db.prepare("SELECT * FROM schedules WHERE agent_id = ? ORDER BY due_at ASC").bind(agentId)
    : db.prepare("SELECT * FROM schedules ORDER BY due_at ASC");
  const result = await query.all<ScheduleRow>();

  return (result.results ?? []).map(mapScheduleRow);
}

export async function getSchedule(
  db: D1Database,
  scheduleId: string
): Promise<ScheduleRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM schedules WHERE id = ?")
    .bind(scheduleId)
    .first<ScheduleRow>();

  return row ? mapScheduleRow(row) : undefined;
}

export async function listDueSchedules(
  db: D1Database,
  dueAtOrBefore: string,
  limit = 25
): Promise<ScheduleRecord[]> {
  const result = await db
    .prepare(
      `SELECT * FROM schedules
       WHERE status = 'active' AND due_at <= ?
       ORDER BY due_at ASC
       LIMIT ?`
    )
    .bind(dueAtOrBefore, limit)
    .all<ScheduleRow>();

  return (result.results ?? []).map(mapScheduleRow);
}

export async function countDueSchedules(db: D1Database, dueAtOrBefore: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM schedules
       WHERE status = 'active' AND due_at <= ?`
    )
    .bind(dueAtOrBefore)
    .first<{ count: number }>();

  return row?.count ?? 0;
}

export async function markScheduleDispatched(
  db: D1Database,
  schedule: ScheduleRecord,
  dispatchedAt: string,
  nextDueAt?: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE schedules
       SET status = ?,
           due_at = ?,
           recurrence_due_at = ?,
           last_run_at = ?,
           attempt_count = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .bind(
      nextDueAt ? "active" : "completed",
      nextDueAt ?? schedule.dueAt,
      nextDueAt ?? schedule.recurrenceDueAt ?? null,
      dispatchedAt,
      schedule.attemptCount + 1,
      dispatchedAt,
      schedule.id
    )
    .run();
}

export async function markScheduleRunStarted(
  db: D1Database,
  scheduleId: string,
  input: { runId: string; startedAt: string }
): Promise<void> {
  await db
    .prepare(
      `UPDATE schedules
       SET last_run_id = ?, last_run_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(input.runId, input.startedAt, input.startedAt, scheduleId)
    .run();
}

export async function recordScheduleRunResult(
  db: D1Database,
  scheduleId: string,
  input: {
    runId: string;
    status: ScheduleRunStatus;
    completedAt: string;
  }
): Promise<ScheduleRecord | undefined> {
  const schedule = await getSchedule(db, scheduleId);
  if (!schedule) {
    return undefined;
  }

  if (input.status === "completed") {
    return completeScheduleRun(db, schedule, input);
  }

  return failScheduleRun(db, schedule, input);
}

export async function pauseSchedule(
  db: D1Database,
  scheduleId: string
): Promise<ScheduleRecord | undefined> {
  await db
    .prepare(
      `UPDATE schedules
       SET status = 'paused', updated_at = ?
       WHERE id = ? AND status = 'active'`
    )
    .bind(nowIso(), scheduleId)
    .run();

  return getSchedule(db, scheduleId);
}

export async function resumeSchedule(
  db: D1Database,
  scheduleId: string
): Promise<ScheduleRecord | undefined> {
  await db
    .prepare(
      `UPDATE schedules
       SET status = 'active',
           attempt_count = 0,
           last_error = NULL,
           updated_at = ?
       WHERE id = ? AND status IN ('paused', 'failed')`
    )
    .bind(nowIso(), scheduleId)
    .run();

  return getSchedule(db, scheduleId);
}

export async function markScheduleManualDispatch(
  db: D1Database,
  scheduleId: string,
  dispatchedAt: string
): Promise<ScheduleRecord | undefined> {
  await db
    .prepare(
      `UPDATE schedules
       SET last_run_at = ?,
           attempt_count = COALESCE(attempt_count, 0) + 1,
           updated_at = ?
       WHERE id = ? AND status != 'cancelled'`
    )
    .bind(dispatchedAt, dispatchedAt, scheduleId)
    .run();

  return getSchedule(db, scheduleId);
}

export async function cancelSchedule(db: D1Database, scheduleId: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE schedules
       SET status = 'cancelled', updated_at = ?
       WHERE id = ? AND status != 'cancelled'`
    )
    .bind(nowIso(), scheduleId)
    .run();

  return Boolean(result.meta.changes);
}

async function completeScheduleRun(
  db: D1Database,
  schedule: ScheduleRecord,
  input: { runId: string; completedAt: string }
): Promise<ScheduleRecord | undefined> {
  const nextStatus: ScheduleRecord["status"] =
    schedule.status === "failed"
      ? schedule.intervalSeconds
        ? "active"
        : "completed"
      : schedule.status;

  await db
    .prepare(
      `UPDATE schedules
       SET status = ?,
           last_run_id = ?,
           last_error = NULL,
           attempt_count = 0,
           updated_at = ?
       WHERE id = ?`
    )
    .bind(nextStatus, input.runId, input.completedAt, schedule.id)
    .run();

  return getSchedule(db, schedule.id);
}

async function failScheduleRun(
  db: D1Database,
  schedule: ScheduleRecord,
  input: { runId: string; status: ScheduleRunStatus; completedAt: string }
): Promise<ScheduleRecord | undefined> {
  const canRetry = schedule.attemptCount < schedule.maxAttempts;
  const nextDueAt = new Date(
    new Date(input.completedAt).getTime() + schedule.retryDelaySeconds * 1000
  ).toISOString();

  await db
    .prepare(
      `UPDATE schedules
       SET status = ?,
           due_at = ?,
           last_run_id = ?,
           last_error = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .bind(
      canRetry ? "active" : "failed",
      canRetry ? nextDueAt : schedule.dueAt,
      input.runId,
      `Run ${input.status}`,
      input.completedAt,
      schedule.id
    )
    .run();

  return getSchedule(db, schedule.id);
}
