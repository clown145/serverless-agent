import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { listRecentToolCalls } from "../../storage/repositories/tool-calls-repository";
import { requireAdmin } from "../admin-auth";
import { listToolCallsSchema, zodMessage } from "./tools/tool-call-schemas";

export async function handleAdminToolCalls(
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
  const parsed = listToolCallsSchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined
  });
  if (!parsed.success) {
    return errorResponse(400, "invalid_query", zodMessage(parsed.error));
  }

  const calls = await listRecentToolCalls(env.AGENT_DB, {
    limit: parsed.data.limit
  });
  return jsonResponse({ ok: true, calls });
}
