export type ToolCallRecord = {
  id: string;
  runId: string;
  stepId: string;
  agentId: string;
  toolName: string;
  status: string;
  inputJson: string;
  outputJson?: string;
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
};

export async function recordToolCall(
  db: D1Database,
  record: ToolCallRecord
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO tool_calls (
        id, run_id, step_id, agent_id, tool_name, status,
        input_json, output_json, error_code, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      record.id,
      record.runId,
      record.stepId,
      record.agentId,
      record.toolName,
      record.status,
      record.inputJson,
      record.outputJson ?? null,
      record.errorCode ?? null,
      record.createdAt,
      record.completedAt ?? null
    )
    .run();
}

export async function completeToolCall(
  db: D1Database,
  id: string,
  input: {
    status: string;
    outputJson?: string;
    errorCode?: string;
    completedAt: string;
  }
): Promise<void> {
  await db
    .prepare(
      `UPDATE tool_calls
       SET status = ?, output_json = ?, error_code = ?, completed_at = ?
       WHERE id = ?`
    )
    .bind(
      input.status,
      input.outputJson ?? null,
      input.errorCode ?? null,
      input.completedAt,
      id
    )
    .run();
}
