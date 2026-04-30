export type RunDetails = {
  run: Record<string, unknown>;
  steps: Record<string, unknown>[];
  toolCalls: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
};

export async function getRunDetails(
  db: D1Database,
  runId: string
): Promise<RunDetails | undefined> {
  const run = await db
    .prepare("SELECT * FROM runs WHERE id = ?")
    .bind(runId)
    .first<Record<string, unknown>>();

  if (!run) {
    return undefined;
  }

  const [steps, toolCalls, auditLogs] = await Promise.all([
    listRows(db, "run_steps", runId),
    listRows(db, "tool_calls", runId),
    listRows(db, "audit_logs", runId)
  ]);

  return { run, steps, toolCalls, auditLogs };
}

async function listRows(
  db: D1Database,
  table: "run_steps" | "tool_calls" | "audit_logs",
  runId: string
): Promise<Record<string, unknown>[]> {
  const result = await db
    .prepare(`SELECT * FROM ${table} WHERE run_id = ? ORDER BY created_at ASC`)
    .bind(runId)
    .all<Record<string, unknown>>();

  return result.results ?? [];
}
