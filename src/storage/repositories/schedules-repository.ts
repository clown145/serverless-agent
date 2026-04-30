import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";

export type ScheduleStatus = "active" | "completed" | "cancelled";

export type ScheduleRecord = {
  id: string;
  agentId: string;
  status: ScheduleStatus;
  dueAt: string;
  intervalSeconds?: number;
  payloadJson: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
};

type ScheduleRow = {
  id: string;
  agent_id: string;
  status: ScheduleStatus;
  due_at: string;
  interval_seconds?: number;
  payload_json: string;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
};

export type CreateScheduleInput = {
  agentId: string;
  dueAt: string;
  intervalSeconds?: number;
  payloadJson: string;
};

export async function createSchedule(
  db: D1Database,
  input: CreateScheduleInput
): Promise<ScheduleRecord> {
  const now = nowIso();
  const id = createId("sch");

  await db
    .prepare(
      `INSERT INTO schedules (
        id, agent_id, status, due_at, interval_seconds,
        payload_json, created_at, updated_at
      ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.agentId,
      input.dueAt,
      input.intervalSeconds ?? null,
      input.payloadJson,
      now,
      now
    )
    .run();

  return {
    id,
    agentId: input.agentId,
    status: "active",
    dueAt: input.dueAt,
    intervalSeconds: input.intervalSeconds,
    payloadJson: input.payloadJson,
    createdAt: now,
    updatedAt: now
  };
}

export async function listSchedules(
  db: D1Database,
  agentId?: string
): Promise<ScheduleRecord[]> {
  const query = agentId
    ? db
        .prepare("SELECT * FROM schedules WHERE agent_id = ? ORDER BY due_at ASC")
        .bind(agentId)
    : db.prepare("SELECT * FROM schedules ORDER BY due_at ASC");
  const result = await query.all<ScheduleRow>();

  return (result.results ?? []).map(mapScheduleRow);
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

export async function markScheduleDispatched(
  db: D1Database,
  schedule: ScheduleRecord,
  dispatchedAt: string,
  nextDueAt?: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE schedules
       SET status = ?, due_at = ?, last_run_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(
      nextDueAt ? "active" : "completed",
      nextDueAt ?? schedule.dueAt,
      dispatchedAt,
      dispatchedAt,
      schedule.id
    )
    .run();
}

export async function cancelSchedule(
  db: D1Database,
  scheduleId: string
): Promise<boolean> {
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

function mapScheduleRow(row: ScheduleRow): ScheduleRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    status: row.status,
    dueAt: row.due_at,
    intervalSeconds: row.interval_seconds ?? undefined,
    payloadJson: row.payload_json,
    lastRunAt: row.last_run_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
