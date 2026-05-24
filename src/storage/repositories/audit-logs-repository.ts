export type AuditLogRecord = {
  id: string;
  agentId: string;
  runId?: string;
  stepId?: string;
  actorId: string;
  action: string;
  resource?: string;
  status: string;
  summary?: string;
  createdAt: string;
};

export async function appendAuditLog(db: D1Database, record: AuditLogRecord): Promise<void> {
  await db
    .prepare(
      `INSERT INTO audit_logs (
        id, agent_id, run_id, step_id, actor_id, action,
        resource, status, summary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      record.id,
      record.agentId,
      record.runId ?? null,
      record.stepId ?? null,
      record.actorId,
      record.action,
      record.resource ?? null,
      record.status,
      record.summary ?? null,
      record.createdAt
    )
    .run();
}
