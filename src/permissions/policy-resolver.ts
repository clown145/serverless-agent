import { resolveDefaultPolicy } from "./default-policy";
import type { PolicyCheck, PolicySubjectType, ResolvedPolicy } from "./policy-types";
import { findMatchingPermissionPolicies } from "../storage/repositories/permission-policies-repository";
import type { PermissionRequirement, ToolExecutionContext } from "../tools/types";

export async function checkToolPolicy(
  context: ToolExecutionContext,
  requirement: PermissionRequirement
): Promise<PolicyCheck> {
  const resolved = await resolvePolicy(context);

  if (requirement.level > resolved.maxLevel) {
    return {
      allowed: false,
      reason: `Tool requires level ${requirement.level}, resolved max level is ${resolved.maxLevel}`,
      resolved
    };
  }

  const missingScope = requirement.scopes.find((scope) => {
    return !resolved.scopes.includes(scope);
  });

  if (missingScope) {
    return {
      allowed: false,
      reason: `Missing required scope: ${missingScope}`,
      resolved
    };
  }

  return { allowed: true, resolved };
}

async function resolvePolicy(
  context: ToolExecutionContext
): Promise<ResolvedPolicy> {
  const baseline = resolveDefaultPolicy(context);
  const db = context.env.AGENT_DB;
  if (!db) {
    return baseline;
  }

  const policies = await findMatchingPermissionPolicies(db, {
    agentId: context.agentId,
    subjects: buildSubjects(context)
  });

  return policies.reduce<ResolvedPolicy>(
    (current, policy) => ({
      maxLevel: Math.max(current.maxLevel, policy.maxLevel) as ResolvedPolicy["maxLevel"],
      scopes: Array.from(new Set([...current.scopes, ...policy.scopes])),
      sources: [...current.sources, `policy:${policy.id}`]
    }),
    baseline
  );
}

function buildSubjects(
  context: ToolExecutionContext
): Array<{ type: PolicySubjectType; id: string }> {
  const subjects: Array<{ type: PolicySubjectType; id: string }> = [
    { type: "agent", id: context.agentId },
    { type: "user", id: context.actorId }
  ];

  if (context.actorRole) {
    subjects.push({ type: "role", id: context.actorRole });
  }

  if (context.platform) {
    subjects.push({ type: "platform", id: context.platform });
  }

  if (context.conversationId) {
    subjects.push({ type: "conversation", id: context.conversationId });
    const rootConversationId = context.conversationId.split("#")[0];
    if (rootConversationId && rootConversationId !== context.conversationId) {
      subjects.push({ type: "conversation", id: rootConversationId });
    }
  }

  return subjects;
}
