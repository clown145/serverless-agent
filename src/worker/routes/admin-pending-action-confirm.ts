import { confirmPendingAction } from "../../permissions/pending-action-executor";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";

export async function handleAdminPendingActionConfirm(
  request: Request,
  env: Env,
  actionId: string
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const execution = await confirmPendingAction(env, actionId);
  if (!execution.ok) {
    return errorResponse(statusForError(execution.code), execution.code, execution.message);
  }

  return jsonResponse({
    ok: true,
    actionId: execution.actionId,
    result: execution.result,
    continuation: execution.continuation
  });
}

function statusForError(code: string): number {
  if (code === "pending_action_not_found") {
    return 404;
  }

  return 409;
}
