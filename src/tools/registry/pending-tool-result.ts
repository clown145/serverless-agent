import { createToolPendingAction } from "../../permissions/pending-action-service";
import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import { appendAuditLog } from "../../storage/repositories/audit-logs-repository";
import { completeToolCall } from "../../storage/repositories/tool-calls-repository";
import type { PermissionDecision } from "../permissions/policy";
import type { ToolDefinition, ToolExecutionContext, ToolResult } from "../types";

export function initialToolCallStatus(decision: PermissionDecision): string {
  if (decision.allowed) {
    return "running";
  }

  return decision.needsConfirmation ? "needs_confirmation" : "permission_denied";
}

export async function createPendingToolResult(
  env: Env,
  input: {
    toolName: string;
    toolCallId: string;
    startedAt: string;
    actorId: string;
    decisionReason?: string;
    context: ToolExecutionContext;
    tool: ToolDefinition;
  }
): Promise<ToolResult> {
  const reason = input.decisionReason ?? "Tool call requires confirmation";
  const pending = await createToolPendingAction(
    input.tool,
    input.context,
    reason
  );

  await completeToolCall(env.AGENT_DB, input.toolCallId, {
    status: "needs_confirmation",
    outputJson: JSON.stringify({ pendingActionId: pending.id }),
    completedAt: nowIso()
  });

  await appendAuditLog(env.AGENT_DB, {
    id: createId("audit"),
    agentId: input.context.agentId,
    runId: input.context.runId,
    stepId: input.context.stepId,
    actorId: input.actorId,
    action: `tool:${input.toolName}`,
    resource: input.toolName,
    status: "needs_confirmation",
    summary: `${reason}; pendingActionId=${pending.id}`,
    createdAt: input.startedAt
  });

  return {
    status: "needs_confirmation",
    output: { pendingActionId: pending.id },
    error: {
      code: "needs_confirmation",
      message: reason,
      retryable: false
    }
  };
}
