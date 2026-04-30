import type { ToolDefinition, ToolExecutionContext } from "../tools/types";
import { createPendingAction } from "../storage/repositories/pending-actions-repository";

export async function createToolPendingAction(
  tool: ToolDefinition,
  context: ToolExecutionContext,
  reason: string
) {
  return createPendingAction(context.env.AGENT_DB, {
    agentId: context.agentId,
    runId: context.runId,
    stepId: context.stepId,
    actorId: context.actorId,
    actorRole: context.actorRole,
    platform: context.platform,
    conversationId: context.conversationId,
    toolName: tool.name,
    inputJson: JSON.stringify(context.input),
    reason,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });
}
