import type { ToolDefinition, ToolExecutionContext } from "../types";

export type PermissionDecision = {
  allowed: boolean;
  reason?: string;
};

export function evaluateToolPermission(
  tool: ToolDefinition,
  context: ToolExecutionContext
): PermissionDecision {
  if (tool.permission.level >= 5 && !context.allowDangerous) {
    return {
      allowed: false,
      reason: "Dangerous tool calls require explicit confirmation"
    };
  }

  return { allowed: true };
}
