export type RunDetails = {
  run: Record<string, unknown>;
  steps: Record<string, unknown>[];
  toolCalls: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  triggerMessage?: Record<string, unknown>;
  conversation?: Record<string, unknown>;
  diagnostics: {
    durationMs?: number;
    stepCount: number;
    modelCallCount: number;
    toolCallCount: number;
    failedStepCount: number;
    failedToolCallCount: number;
    lastError?: string;
  };
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

  const [steps, toolCalls, auditLogs, triggerMessage, conversation] = await Promise.all([
    listRows(db, "run_steps", runId),
    listRows(db, "tool_calls", runId),
    listRows(db, "audit_logs", runId),
    getTriggerMessage(db, run.trigger_message_id),
    getConversation(db, run.agent_id, run.conversation_id)
  ]);

  const parsedToolCalls = toolCalls.map(parseToolCall);

  return {
    run,
    steps,
    toolCalls: parsedToolCalls,
    auditLogs,
    triggerMessage,
    conversation,
    diagnostics: createDiagnostics(run, steps, parsedToolCalls)
  };
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

async function getTriggerMessage(
  db: D1Database,
  messageId: unknown
): Promise<Record<string, unknown> | undefined> {
  if (typeof messageId !== "string") {
    return undefined;
  }

  const row = await db
    .prepare("SELECT * FROM messages WHERE id = ?")
    .bind(messageId)
    .first<Record<string, unknown>>();

  return row ?? undefined;
}

async function getConversation(
  db: D1Database,
  agentId: unknown,
  conversationId: unknown
): Promise<Record<string, unknown> | undefined> {
  if (typeof agentId !== "string" || typeof conversationId !== "string") {
    return undefined;
  }

  const row = await db
    .prepare(
      `SELECT * FROM conversation_settings
       WHERE agent_id = ? AND conversation_id = ?`
    )
    .bind(agentId, conversationId)
    .first<Record<string, unknown>>();

  return row ?? undefined;
}

function parseToolCall(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    input: parseJson(row.input_json),
    output: parseJson(row.output_json),
    latency_ms: elapsedMs(row.created_at, row.completed_at)
  };
}

function createDiagnostics(
  run: Record<string, unknown>,
  steps: Record<string, unknown>[],
  toolCalls: Record<string, unknown>[]
): RunDetails["diagnostics"] {
  const failedSteps = steps.filter((step) => step.status === "failed");
  const failedToolCalls = toolCalls.filter(
    (toolCall) =>
      toolCall.status === "failed" ||
      toolCall.status === "permission_denied" ||
      toolCall.status === "needs_confirmation"
  );
  const lastError =
    [...failedToolCalls].reverse()[0]?.error_code ?? [...failedSteps].reverse()[0]?.summary;

  return {
    durationMs: elapsedMs(run.created_at, run.updated_at),
    stepCount: steps.length,
    modelCallCount: steps.filter((step) => step.kind === "model_called").length,
    toolCallCount: toolCalls.length,
    failedStepCount: failedSteps.length,
    failedToolCallCount: failedToolCalls.length,
    lastError: typeof lastError === "string" ? lastError : undefined
  };
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function elapsedMs(start: unknown, end: unknown): number | undefined {
  if (typeof start !== "string" || typeof end !== "string") {
    return undefined;
  }

  const elapsed = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : undefined;
}
