import type { PermissionRequirement, RegisteredTool, ToolSideEffect, ToolSource } from "../types";
import { mcpToolInternalName } from "./names";
import { mapMcpToolResult } from "./result";
import type { McpCallTool, McpTool } from "./types";

export type McpRegisteredToolInput = {
  serverId: string;
  serverName: string;
  tool: McpTool;
  callTool: McpCallTool;
  permission?: PermissionRequirement;
  sideEffect?: ToolSideEffect;
  timeoutMs?: number;
};

export function createMcpRegisteredTool(input: McpRegisteredToolInput): RegisteredTool {
  const source: ToolSource = {
    type: "mcp",
    id: input.serverId,
    name: input.serverName
  };

  return {
    source,
    definition: {
      name: mcpToolInternalName(input.serverId, input.tool.name),
      title: input.tool.title,
      description: input.tool.description ?? input.tool.name,
      inputSchema: input.tool.inputSchema,
      outputSchema: input.tool.outputSchema,
      annotations: input.tool.annotations,
      permission: input.permission ?? {
        level: 3,
        scopes: [`mcp:${input.serverId}:call`]
      },
      sideEffect: input.sideEffect ?? sideEffectFromAnnotations(input.tool),
      timeoutMs: input.timeoutMs ?? 15_000
    },
    execute: async (context) => {
      try {
        const result = await input.callTool({
          name: input.tool.name,
          arguments: asArguments(context.input)
        });
        return mapMcpToolResult(result);
      } catch (error) {
        return {
          status: "failed",
          error: {
            code: "mcp_transport_error",
            message: error instanceof Error ? error.message : "MCP tool call failed",
            retryable: true
          }
        };
      }
    }
  };
}

function sideEffectFromAnnotations(tool: McpTool): ToolSideEffect {
  if (tool.annotations?.readOnlyHint) {
    return "none";
  }

  if (tool.annotations?.destructiveHint) {
    return "dangerous";
  }

  return tool.annotations?.openWorldHint === false ? "workspace_write" : "external_write";
}

function asArguments(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}
