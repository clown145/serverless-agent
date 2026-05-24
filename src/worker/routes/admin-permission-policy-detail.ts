import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  deletePermissionPolicy,
  updatePermissionPolicy
} from "../../storage/repositories/permission-policies-repository";
import { policyPayloadSchema } from "./admin-permission-policies";

export async function handleAdminPermissionPolicyDetail(
  request: Request,
  env: Env,
  policyId: string
): Promise<Response> {
  if (request.method === "PUT") {
    const parsed = policyPayloadSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", parsed.error.message);
    }

    const policy = await updatePermissionPolicy(env.AGENT_DB, policyId, {
      agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
      subjectType: parsed.data.subjectType,
      subjectId: parsed.data.subjectId,
      maxLevel: parsed.data.maxLevel,
      scopes: parsed.data.scopes
    });
    if (!policy) {
      return errorResponse(404, "policy_not_found", "Permission policy not found");
    }

    return jsonResponse({ ok: true, policy });
  }

  if (request.method === "DELETE") {
    const deleted = await deletePermissionPolicy(env.AGENT_DB, policyId);
    if (!deleted) {
      return errorResponse(404, "policy_not_found", "Permission policy not found");
    }

    return jsonResponse({ ok: true, deleted: true });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
