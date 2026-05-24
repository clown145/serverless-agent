import { z } from "zod";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  createPermissionPolicy,
  listPermissionPolicies
} from "../../storage/repositories/permission-policies-repository";

const createPolicySchema = z.object({
  agentId: z.string().min(1).optional(),
  subjectType: z.enum(["agent", "user", "role", "platform", "conversation"]),
  subjectId: z.string().min(1),
  maxLevel: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5)
  ]),
  scopes: z.array(z.string().min(1)).default([])
});

export async function handleAdminPermissionPolicies(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method === "GET") {
    const agentId = new URL(request.url).searchParams.get("agentId") ?? undefined;
    const policies = await listPermissionPolicies(env.AGENT_DB, agentId);
    return jsonResponse({ ok: true, policies });
  }

  if (request.method === "POST") {
    const parsed = createPolicySchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", parsed.error.message);
    }

    const policy = await createPermissionPolicy(env.AGENT_DB, {
      agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
      subjectType: parsed.data.subjectType,
      subjectId: parsed.data.subjectId,
      maxLevel: parsed.data.maxLevel,
      scopes: parsed.data.scopes
    });

    return jsonResponse({ ok: true, policy }, { status: 201 });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
