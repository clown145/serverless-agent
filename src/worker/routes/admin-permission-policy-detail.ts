import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { deletePermissionPolicy } from "../../storage/repositories/permission-policies-repository";

export async function handleAdminPermissionPolicyDetail(
  request: Request,
  env: Env,
  policyId: string
): Promise<Response> {
  if (request.method !== "DELETE") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const deleted = await deletePermissionPolicy(env.AGENT_DB, policyId);
  if (!deleted) {
    return errorResponse(404, "policy_not_found", "Permission policy not found");
  }

  return jsonResponse({ ok: true, deleted: true });
}
