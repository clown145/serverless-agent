import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { listDebugMessages } from "../../storage/repositories/message-debug-repository";
import { requireAdmin } from "../admin-auth";
import { listDebugMessagesSchema, zodMessage } from "./debug/debug-schemas";

export async function handleAdminDebugMessages(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method !== "GET") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const url = new URL(request.url);
  const parsed = listDebugMessagesSchema.safeParse({
    agentId: url.searchParams.get("agentId") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined
  });
  if (!parsed.success) {
    return errorResponse(400, "invalid_query", zodMessage(parsed.error));
  }

  const messages = await listDebugMessages(env.AGENT_DB, {
    agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    platform: parsed.data.platform,
    limit: parsed.data.limit
  });

  return jsonResponse({ ok: true, messages });
}
