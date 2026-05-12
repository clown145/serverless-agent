import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapPendingActionRow,
  type PendingActionRecord,
  type PendingActionRow
} from "./pending-actions-types";

export type CreatePendingActionInput = {
  agentId: string;
  runId: string;
  stepId: string;
  actorId: string;
  actorRole?: string;
  platform?: string;
  conversationId?: string;
  toolName: string;
  inputJson: string;
  reason?: string;
  expiresAt: string;
};

export async function createPendingAction(
  db: D1Database,
  input: CreatePendingActionInput
): Promise<PendingActionRecord> {
  const id = createId("act");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO pending_actions (
        id, agent_id, run_id, step_id, actor_id, actor_role,
        platform, conversation_id, tool_name,
        input_json, status, reason, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.agentId,
      input.runId,
      input.stepId,
      input.actorId,
      input.actorRole ?? null,
      input.platform ?? null,
      input.conversationId ?? null,
      input.toolName,
      input.inputJson,
      input.reason ?? null,
      input.expiresAt,
      now,
      now
    )
    .run();

  return {
    id,
    agentId: input.agentId,
    runId: input.runId,
    stepId: input.stepId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    platform: input.platform,
    conversationId: input.conversationId,
    toolName: input.toolName,
    inputJson: input.inputJson,
    status: "pending",
    reason: input.reason,
    expiresAt: input.expiresAt,
    createdAt: now,
    updatedAt: now
  };
}

export async function getPendingAction(
  db: D1Database,
  id: string
): Promise<PendingActionRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM pending_actions WHERE id = ?")
    .bind(id)
    .first<PendingActionRow>();

  return row ? mapPendingActionRow(row) : undefined;
}

export async function listPendingActions(
  db: D1Database,
  agentId?: string
): Promise<PendingActionRecord[]> {
  const query = agentId
    ? db
        .prepare("SELECT * FROM pending_actions WHERE agent_id = ? ORDER BY created_at DESC")
        .bind(agentId)
    : db.prepare("SELECT * FROM pending_actions ORDER BY created_at DESC");
  const result = await query.all<PendingActionRow>();

  return (result.results ?? []).map(mapPendingActionRow);
}

export async function markPendingActionConfirmed(
  db: D1Database,
  id: string
): Promise<boolean> {
  const now = nowIso();
  const result = await db
    .prepare(
      `UPDATE pending_actions
       SET status = 'confirmed', confirmed_at = ?, updated_at = ?
       WHERE id = ? AND status = 'pending'`
    )
    .bind(now, now, id)
    .run();

  return Boolean(result.meta.changes);
}

export async function markPendingActionCancelled(
  db: D1Database,
  id: string
): Promise<boolean> {
  const now = nowIso();
  const result = await db
    .prepare(
      `UPDATE pending_actions
       SET status = 'cancelled', updated_at = ?
       WHERE id = ? AND status = 'pending'`
    )
    .bind(now, id)
    .run();

  return Boolean(result.meta.changes);
}

export async function markPendingActionExecuted(
  db: D1Database,
  id: string,
  input: {
    resultJson?: string;
    errorCode?: string;
  }
): Promise<void> {
  const now = nowIso();
  await db
    .prepare(
      `UPDATE pending_actions
       SET status = 'executed', result_json = ?, error_code = ?,
           executed_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(input.resultJson ?? null, input.errorCode ?? null, now, now, id)
    .run();
}
