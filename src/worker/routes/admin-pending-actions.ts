import { jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { listPendingActions } from "../../storage/repositories/pending-actions-repository";

export async function handleAdminPendingActions(request: Request, env: Env): Promise<Response> {
  const agentId = new URL(request.url).searchParams.get("agentId") ?? undefined;
  const actions = await listPendingActions(env.AGENT_DB, agentId);
  return jsonResponse({ ok: true, actions });
}
