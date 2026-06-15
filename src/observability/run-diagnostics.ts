export type RunDiagnostics = {
  durationMs?: number;
  stepCount: number;
  modelCallCount: number;
  toolCallCount: number;
  auditLogCount: number;
  failedStepCount: number;
  failedToolCallCount: number;
  lastError?: string;
  stepStatusCounts: Record<string, number>;
  toolStatusCounts: Record<string, number>;
  auditStatusCounts: Record<string, number>;
  toolLatencyMs: {
    completedCount: number;
    average?: number;
    max?: number;
    slowestToolName?: string;
    slowestToolId?: string;
  };
  timeline: {
    startedAt?: string;
    completedAt?: string;
    firstEventAt?: string;
    lastEventAt?: string;
    lastStepAt?: string;
    lastToolCompletedAt?: string;
  };
  errorSummary: {
    count: number;
    category?: RunErrorCategory;
    source?: "run_step" | "tool_call";
    toolName?: string;
    message?: string;
    code?: string;
    at?: string;
  };
};

export type RunErrorCategory =
  | "permission_denied"
  | "needs_confirmation"
  | "validation_error"
  | "tool_failed"
  | "run_failed";

type RunEvent = {
  source: "run_step" | "tool_call";
  at?: string;
  category: RunErrorCategory;
  toolName?: string;
  message?: string;
  code?: string;
};

export function createRunDiagnostics(input: {
  run: Record<string, unknown>;
  steps: Record<string, unknown>[];
  toolCalls: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
}): RunDiagnostics {
  const { run, steps, toolCalls, auditLogs } = input;
  const failedSteps = steps.filter((step) => step.status === "failed");
  const failedToolCalls = toolCalls.filter(isFailedToolCall);
  const errorEvents = [
    ...failedSteps.map(createStepErrorEvent),
    ...failedToolCalls.map((toolCall) => createToolErrorEvent(toolCall, auditLogs))
  ];
  const lastError = latestEvent(errorEvents);
  const toolLatencyMs = summarizeToolLatency(toolCalls);

  return {
    durationMs: elapsedMs(run.created_at, run.updated_at),
    stepCount: steps.length,
    modelCallCount: steps.filter((step) => step.kind === "model_called").length,
    toolCallCount: toolCalls.length,
    auditLogCount: auditLogs.length,
    failedStepCount: failedSteps.length,
    failedToolCallCount: failedToolCalls.length,
    lastError: lastError?.message ?? lastError?.code,
    stepStatusCounts: countBy(steps, "status"),
    toolStatusCounts: countBy(toolCalls, "status"),
    auditStatusCounts: countBy(auditLogs, "status"),
    toolLatencyMs,
    timeline: createTimeline(run, steps, toolCalls, auditLogs),
    errorSummary: {
      count: errorEvents.length,
      category: lastError?.category,
      source: lastError?.source,
      toolName: lastError?.toolName,
      message: lastError?.message,
      code: lastError?.code,
      at: lastError?.at
    }
  };
}

function isFailedToolCall(toolCall: Record<string, unknown>): boolean {
  return (
    toolCall.status === "failed" ||
    toolCall.status === "permission_denied" ||
    toolCall.status === "needs_confirmation"
  );
}

function createStepErrorEvent(step: Record<string, unknown>): RunEvent {
  return {
    source: "run_step",
    at: asString(step.created_at),
    category: "run_failed",
    message: asString(step.summary)
  };
}

function createToolErrorEvent(
  toolCall: Record<string, unknown>,
  auditLogs: Record<string, unknown>[]
): RunEvent {
  const status = asString(toolCall.status);
  const code = asString(toolCall.error_code);
  const toolName = asString(toolCall.tool_name);
  const auditSummary = findToolAuditSummary(toolCall, auditLogs);

  return {
    source: "tool_call",
    at: asString(toolCall.completed_at) ?? asString(toolCall.created_at),
    category: classifyToolError(status, code),
    toolName,
    message: auditSummary ?? code ?? toolName,
    code
  };
}

function findToolAuditSummary(
  toolCall: Record<string, unknown>,
  auditLogs: Record<string, unknown>[]
): string | undefined {
  const stepId = asString(toolCall.step_id);
  const toolName = asString(toolCall.tool_name);
  const matchingAudit = auditLogs.find((auditLog) => {
    if (stepId && auditLog.step_id === stepId) {
      return true;
    }

    return toolName ? auditLog.action === `tool:${toolName}` : false;
  });

  return asString(matchingAudit?.summary);
}

function classifyToolError(status?: string, code?: string): RunErrorCategory {
  if (status === "permission_denied" || code === "permission_denied") {
    return "permission_denied";
  }

  if (status === "needs_confirmation" || code === "needs_confirmation") {
    return "needs_confirmation";
  }

  if (code?.includes("validation")) {
    return "validation_error";
  }

  return "tool_failed";
}

function summarizeToolLatency(
  toolCalls: Record<string, unknown>[]
): RunDiagnostics["toolLatencyMs"] {
  const completed = toolCalls
    .map((toolCall) => ({
      id: asString(toolCall.id),
      name: asString(toolCall.tool_name),
      latencyMs: asNumber(toolCall.latency_ms)
    }))
    .filter(
      (
        toolCall
      ): toolCall is { id: string | undefined; name: string | undefined; latencyMs: number } =>
        Number.isFinite(toolCall.latencyMs)
    );

  if (completed.length === 0) {
    return { completedCount: 0 };
  }

  const total = completed.reduce((sum, toolCall) => sum + toolCall.latencyMs, 0);
  const slowest = completed.reduce((max, toolCall) =>
    toolCall.latencyMs > max.latencyMs ? toolCall : max
  );

  return {
    completedCount: completed.length,
    average: Math.round(total / completed.length),
    max: slowest.latencyMs,
    slowestToolName: slowest.name,
    slowestToolId: slowest.id
  };
}

function createTimeline(
  run: Record<string, unknown>,
  steps: Record<string, unknown>[],
  toolCalls: Record<string, unknown>[],
  auditLogs: Record<string, unknown>[]
): RunDiagnostics["timeline"] {
  const stepTimes = steps.map((step) => asString(step.created_at)).filter(isString);
  const toolTimes = toolCalls
    .flatMap((toolCall) => [asString(toolCall.created_at), asString(toolCall.completed_at)])
    .filter(isString);
  const auditTimes = auditLogs.map((auditLog) => asString(auditLog.created_at)).filter(isString);
  const allTimes = [
    asString(run.created_at),
    asString(run.updated_at),
    ...stepTimes,
    ...toolTimes,
    ...auditTimes
  ].filter(isString);

  return {
    startedAt: asString(run.created_at),
    completedAt: asString(run.updated_at),
    firstEventAt: minIso(allTimes),
    lastEventAt: maxIso(allTimes),
    lastStepAt: maxIso(stepTimes),
    lastToolCompletedAt: maxIso(
      toolCalls.map((toolCall) => asString(toolCall.completed_at)).filter(isString)
    )
  };
}

function countBy(rows: Record<string, unknown>[], key: string): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = asString(row[key]) ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function latestEvent(events: RunEvent[]): RunEvent | undefined {
  if (events.length === 0) {
    return undefined;
  }

  let latest = events[0];
  let latestTimestamp = timestamp(latest.at);

  for (let index = 1; index < events.length; index += 1) {
    const event = events[index];
    const eventTimestamp = timestamp(event.at);
    if (eventTimestamp > latestTimestamp) {
      latest = event;
      latestTimestamp = eventTimestamp;
    }
  }

  return latest;
}

function minIso(values: string[]): string | undefined {
  if (values.length === 0) {
    return undefined;
  }

  let minValue = values[0];
  let minTimestamp = timestamp(minValue);

  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    const valueTimestamp = timestamp(value);
    if (valueTimestamp < minTimestamp) {
      minValue = value;
      minTimestamp = valueTimestamp;
    }
  }

  return minValue;
}

function maxIso(values: string[]): string | undefined {
  if (values.length === 0) {
    return undefined;
  }

  let maxValue = values[0];
  let maxTimestamp = timestamp(maxValue);

  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    const valueTimestamp = timestamp(value);
    if (valueTimestamp > maxTimestamp) {
      maxValue = value;
      maxTimestamp = valueTimestamp;
    }
  }

  return maxValue;
}

function timestamp(value?: string): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function elapsedMs(start: unknown, end: unknown): number | undefined {
  if (typeof start !== "string" || typeof end !== "string") {
    return undefined;
  }

  const elapsed = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function isString(value: string | undefined): value is string {
  return typeof value === "string";
}
