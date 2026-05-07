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

export type ToolCallHistoryItem = ToolCallRecord & {
  input: unknown;
  output?: unknown;
  latencyMs?: number;
};

type ToolCallRow = {
  id: string;
  run_id: string;
  step_id: string;
  agent_id: string;
  tool_name: string;
  status: string;
  input_json: string;
  output_json?: string | null;
  error_code?: string | null;
  created_at: string;
  completed_at?: string | null;
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

export async function listRecentToolCalls(
  db: D1Database,
  input: { limit?: number } = {}
): Promise<ToolCallHistoryItem[]> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const result = await db
    .prepare("SELECT * FROM tool_calls ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all<ToolCallRow>();

  return (result.results ?? []).map(mapToolCallRow);
}

function mapToolCallRow(row: ToolCallRow): ToolCallHistoryItem {
  return {
    id: row.id,
    runId: row.run_id,
    stepId: row.step_id,
    agentId: row.agent_id,
    toolName: row.tool_name,
    status: row.status,
    inputJson: row.input_json,
    outputJson: row.output_json ?? undefined,
    errorCode: row.error_code ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    input: parseJson(row.input_json),
    output: row.output_json ? parseJson(row.output_json) : undefined,
    latencyMs: elapsedMs(row.created_at, row.completed_at)
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function elapsedMs(start: string, end?: string | null): number | undefined {
  if (!end) {
    return undefined;
  }

  const elapsed = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : undefined;
}
