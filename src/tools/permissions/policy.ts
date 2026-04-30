import type { ToolDefinition, ToolExecutionContext } from "../types";
import { checkToolPolicy } from "../../permissions/policy-resolver";

export type PermissionDecision = {
  allowed: boolean;
  needsConfirmation?: boolean;
  reason?: string;
  policySources?: string[];
};

export async function evaluateToolPermission(
  tool: ToolDefinition,
  context: ToolExecutionContext
): Promise<PermissionDecision> {
  const policy = await checkToolPolicy(context, tool.permission);
  if (!policy.allowed) {
    return {
      allowed: false,
      reason: policy.reason,
      policySources: policy.resolved.sources
    };
  }

  if (requiresConfirmation(tool, context)) {
    return {
      allowed: false,
      needsConfirmation: true,
      reason: "Tool call requires explicit confirmation",
      policySources: policy.resolved.sources
    };
  }

  return { allowed: true, policySources: policy.resolved.sources };
}

function requiresConfirmation(
  tool: ToolDefinition,
  context: ToolExecutionContext
): boolean {
  if (context.allowDangerous) {
    return false;
  }

  return (
    tool.permission.level >= 5 ||
    tool.permission.confirmationRequired === true ||
    tool.sideEffect === "dangerous"
  );
}
