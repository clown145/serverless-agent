import { createRuntimeToolRegistry } from "../tools/registry/tool-registry";
import type { Env } from "../shared/types/env";
import {
  getPendingAction,
  markPendingActionCancelled,
  markPendingActionConfirmed,
  markPendingActionExecuted
} from "../storage/repositories/pending-actions-repository";
import type { ToolResult } from "../tools/types";
import {
  enqueuePendingActionContinuation,
  type PendingActionContinuation
} from "./pending-action-continuation";

export type PendingActionExecution =
  | {
      ok: true;
      actionId: string;
      result: ToolResult;
      continuation: PendingActionContinuation;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function confirmPendingAction(
  env: Env,
  actionId: string
): Promise<PendingActionExecution> {
  const action = await getPendingAction(env.AGENT_DB, actionId);
  if (!action) {
    return failed("pending_action_not_found", "Pending action not found");
  }

  if (action.status === "executed") {
    return failed("already_executed", "Pending action already executed");
  }

  if (action.status !== "pending") {
    return failed("invalid_pending_action_status", "Pending action is not pending");
  }

  if (new Date(action.expiresAt).getTime() < Date.now()) {
    return failed("pending_action_expired", "Pending action expired");
  }

  const confirmed = await markPendingActionConfirmed(env.AGENT_DB, action.id);
  if (!confirmed) {
    return failed("pending_action_changed", "Pending action status changed");
  }

  const registry = await createRuntimeToolRegistry(env);
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

  const continuation = await enqueuePendingActionContinuation(env, action, result);

  return { ok: true, actionId: action.id, result, continuation };
}

export async function rejectPendingAction(
  env: Env,
  actionId: string
): Promise<{ ok: true; actionId: string } | { ok: false; code: string; message: string }> {
  const action = await getPendingAction(env.AGENT_DB, actionId);
  if (!action) {
    return failed("pending_action_not_found", "Pending action not found");
  }

  if (action.status !== "pending") {
    return failed("invalid_pending_action_status", "Pending action is not pending");
  }

  const cancelled = await markPendingActionCancelled(env.AGENT_DB, actionId);
  if (!cancelled) {
    return failed("pending_action_changed", "Pending action status changed");
  }

  return { ok: true, actionId };
}

function failed(code: string, message: string): { ok: false; code: string; message: string } {
  return { ok: false, code, message };
}
