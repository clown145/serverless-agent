import { jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { listHeartbeats } from "../../storage/repositories/heartbeats-repository";

export async function handleAdminHeartbeats(
  request: Request,
  env: Env
): Promise<Response> {
  const agentId = new URL(request.url).searchParams.get("agentId") ?? undefined;
  const heartbeats = await listHeartbeats(env.AGENT_DB, agentId);
  return jsonResponse({ ok: true, heartbeats });
}
