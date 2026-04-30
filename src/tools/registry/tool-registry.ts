import { appendAuditLog } from "../../storage/repositories/audit-logs-repository";
import { recordToolCall } from "../../storage/repositories/tool-calls-repository";
import { createId } from "../../shared/ids";
import type { Env } from "../../shared/types/env";
import { nowIso } from "../../shared/time";
import { createMessagingTools } from "../messaging/tools";
import { evaluateToolPermission } from "../permissions/policy";
import { createVfsTools } from "../vfs/tools";
import type { RegisteredTool, ToolResult } from "../types";

export type ToolRegistry = {
  execute(name: string, input: RegistryExecuteInput): Promise<ToolResult>;
  list(): RegisteredTool[];
};

type RegistryExecuteInput = {
  agentId: string;
  actorId: string;
  runId: string;
  stepId: string;
  input: unknown;
  allowDangerous?: boolean;
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
      const decision = evaluateToolPermission(tool.definition, context);

      await recordToolCall(env.AGENT_DB, {
        id: toolCallId,
        runId: input.runId,
        stepId: input.stepId,
        agentId: input.agentId,
        toolName: name,
        status: decision.allowed ? "running" : "permission_denied",
        inputJson: JSON.stringify(input.input),
        createdAt: startedAt
      });

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

      const result = await tool.execute(context);
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

function failed(code: string, message: string, retryable: boolean): ToolResult {
  return {
    status: "failed",
    error: { code, message, retryable }
  };
}
