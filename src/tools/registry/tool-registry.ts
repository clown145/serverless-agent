import { appendAuditLog } from "../../storage/repositories/audit-logs-repository";
import {
  completeToolCall,
  recordToolCall
} from "../../storage/repositories/tool-calls-repository";
import { createId } from "../../shared/ids";
import type { Env } from "../../shared/types/env";
import { nowIso } from "../../shared/time";
import { createMessagingTools } from "../messaging/tools";
import { evaluateToolPermission } from "../permissions/policy";
import { createVfsTools } from "../vfs/tools";
import type { RegisteredTool, ToolResult } from "../types";
import {
  createPendingToolResult,
  initialToolCallStatus
} from "./pending-tool-result";

export type ToolRegistry = {
  execute(name: string, input: RegistryExecuteInput): Promise<ToolResult>;
  list(): RegisteredTool[];
};

type RegistryExecuteInput = {
  agentId: string;
  actorId: string;
  actorRole?: string;
  platform?: string;
  conversationId?: string;
  runId: string;
  stepId: string;
  input: unknown;
  allowDangerous?: boolean;
  confirmedActionId?: string;
};

export function createToolRegistry(env: Env): ToolRegistry {
  const tools = [...createMessagingTools(), ...createVfsTools()];
  const byName = new Map(tools.map((tool) => [tool.definition.name, tool]));

  return {
    list: () => tools,

    execute: async (name, input) => {
      const tool = byName.get(name);
      if (!tool) {
        return failed("unknown_tool", `Unknown tool: ${name}`, false);
      }

      const toolCallId = createId("tool");
      const startedAt = nowIso();
      const context = { ...input, env };
      const decision = await evaluateToolPermission(tool.definition, context);

      await recordToolCall(env.AGENT_DB, {
        id: toolCallId,
        runId: input.runId,
        stepId: input.stepId,
        agentId: input.agentId,
        toolName: name,
        status: initialToolCallStatus(decision),
        inputJson: JSON.stringify(input.input),
        createdAt: startedAt
      });

      if (decision.needsConfirmation) {
        return createPendingToolResult(env, {
          toolName: name,
          toolCallId,
          startedAt,
          actorId: input.actorId,
          decisionReason: decision.reason,
          context,
          tool: tool.definition
        });
      }

      if (!decision.allowed) {
        await appendAuditLog(env.AGENT_DB, {
          id: createId("audit"),
          agentId: input.agentId,
          runId: input.runId,
          stepId: input.stepId,
          actorId: input.actorId,
          action: `tool:${name}`,
          resource: name,
          status: "permission_denied",
          summary: decision.reason,
          createdAt: startedAt
        });

        return {
          status: "permission_denied",
          error: {
            code: "permission_denied",
            message: decision.reason ?? "Permission denied",
            retryable: false
          }
        };
      }

      const result = await executeToolSafely(tool, context);
      await completeToolCall(env.AGENT_DB, toolCallId, {
        status: result.status,
        outputJson: result.output ? JSON.stringify(result.output) : undefined,
        errorCode: result.error?.code,
        completedAt: nowIso()
      });

      await appendAuditLog(env.AGENT_DB, {
        id: createId("audit"),
        agentId: input.agentId,
        runId: input.runId,
        stepId: input.stepId,
        actorId: input.actorId,
        action: `tool:${name}`,
        resource: name,
        status: result.status,
        summary: result.error?.message ?? "Tool executed",
        createdAt: nowIso()
      });

      return result;
    }
  };
}

async function executeToolSafely(
  tool: RegisteredTool,
  context: Parameters<RegisteredTool["execute"]>[0]
): Promise<ToolResult> {
  try {
    return await tool.execute(context);
  } catch (error) {
    return failed(
      "tool_execution_error",
      error instanceof Error ? error.message : "Tool execution failed",
      true
    );
  }
}

function failed(code: string, message: string, retryable: boolean): ToolResult {
  return {
    status: "failed",
    error: { code, message, retryable }
  };
}
