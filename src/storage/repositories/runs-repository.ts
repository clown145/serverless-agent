import type { RunStatus, RunStepInput } from "../../core/run-state";
import { nowIso } from "../../shared/time";

export type CreateRunInput = {
  id: string;
  agentId: string;
  conversationId: string;
  triggerMessageId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
};

export async function createRun(
  db: D1Database,
  input: CreateRunInput
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO runs (
        id, agent_id, conversation_id, trigger_message_id,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.id,
      input.agentId,
      input.conversationId,
      input.triggerMessageId,
      input.status,
      input.createdAt,
      input.updatedAt
    )
    .run();
}

export async function appendRunStep(
  db: D1Database,
  input: RunStepInput
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO run_steps (
        id, run_id, agent_id, status, kind, summary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.id,
      input.runId,
      input.agentId,
      input.status,
      input.kind,
      input.summary ?? null,
      nowIso()
    )
    .run();
}

export async function completeRun(
  db: D1Database,
  runId: string,
  status: RunStatus
): Promise<void> {
  await db
    .prepare("UPDATE runs SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, nowIso(), runId)
    .run();
}
