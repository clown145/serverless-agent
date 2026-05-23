import type { ToolDefinition, ToolExecutionContext } from "../types";
import { checkToolPolicy } from "../../permissions/policy-resolver";
import { getSkillSettings } from "../../storage/repositories/skill-settings-repository";

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

  if (await requiresConfirmation(tool, context)) {
    return {
      allowed: false,
      needsConfirmation: true,
      reason: "Tool call requires explicit confirmation",
      policySources: policy.resolved.sources
    };
  }

  return { allowed: true, policySources: policy.resolved.sources };
}

async function requiresConfirmation(
  tool: ToolDefinition,
  context: ToolExecutionContext
): Promise<boolean> {
  if (context.allowDangerous) {
    return false;
  }

  if (tool.name === "skills.write_file") {
    const settings = await getSkillSettings(context.env.AGENT_DB, context.agentId);
    if (!settings.editConfirmationRequired) {
      return false;
    }
  }

  return (
    tool.permission.level >= 5 ||
    tool.permission.confirmationRequired === true ||
    tool.sideEffect === "dangerous"
  );
}
