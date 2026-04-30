import { createToolRegistry } from "../../tools/registry/tool-registry";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  getPendingAction,
  markPendingActionConfirmed,
  markPendingActionExecuted
} from "../../storage/repositories/pending-actions-repository";
import { requireAdmin } from "../admin-auth";

export async function handleAdminPendingActionConfirm(
  request: Request,
  env: Env,
  actionId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const action = await getPendingAction(env.AGENT_DB, actionId);
  if (!action) {
    return errorResponse(404, "pending_action_not_found", "Pending action not found");
  }

  if (action.status === "executed") {
    return errorResponse(409, "already_executed", "Pending action already executed");
  }

  if (action.status !== "pending") {
    return errorResponse(409, "invalid_pending_action_status", "Pending action is not pending");
  }

  if (new Date(action.expiresAt).getTime() < Date.now()) {
    return errorResponse(409, "pending_action_expired", "Pending action expired");
  }

  const confirmed = await markPendingActionConfirmed(env.AGENT_DB, action.id);
  if (!confirmed) {
    return errorResponse(409, "pending_action_changed", "Pending action status changed");
  }

  const registry = createToolRegistry(env);
  const result = await registry.execute(action.toolName, {
    agentId: action.agentId,
    actorId: action.actorId,
    actorRole: action.actorRole,
    platform: action.platform,
    conversationId: action.conversationId,
    runId: action.runId,
    stepId: action.stepId,
    input: JSON.parse(action.inputJson) as unknown,
    allowDangerous: true,
    confirmedActionId: action.id
  });

  await markPendingActionExecuted(env.AGENT_DB, action.id, {
    resultJson: JSON.stringify(result.output ?? null),
    errorCode: result.error?.code
  });

  return jsonResponse({ ok: true, actionId: action.id, result });
}
