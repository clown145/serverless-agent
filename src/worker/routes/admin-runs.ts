import { jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { listRuns } from "../../storage/repositories/runs-list-repository";
import { requireAdmin } from "../admin-auth";

export async function handleAdminRuns(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "25");
  const runs = await listRuns(env.AGENT_DB, { agentId, limit });

  return jsonResponse({ ok: true, runs });
}
