import { fetchQqOfficialGateway } from "../../adapters/qq/official/gateway-object";
import { connectConfiguredQqOfficialGateways } from "../../adapters/qq/official/keepalive";
import type { Env } from "../../shared/types/env";
import { errorResponse, jsonResponse } from "../../shared/http";

export async function handleQqOfficialGatewayAdmin(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") ?? env.DEFAULT_AGENT_ID ?? "default";
  const action = url.pathname.replace("/admin/platforms/qq-official/", "");

  if (request.method === "POST" && action === "connect") {
    return proxyGateway(env, agentId, "/connect", { method: "POST" });
  }

  if (request.method === "POST" && action === "disconnect") {
    return proxyGateway(env, agentId, "/disconnect", { method: "POST" });
  }

  if (request.method === "GET" && action === "status") {
    return proxyGateway(env, agentId, "/status", { method: "GET" });
  }

  return errorResponse(404, "not_found", "QQ official admin route not found");
}

async function proxyGateway(
  env: Env,
  agentId: string,
  pathname: string,
  init: RequestInit
): Promise<Response> {
  const response = await fetchQqOfficialGateway(env, agentId, pathname, init);
  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  });
}

export async function handleQqOfficialGatewayConnectAll(
  env: Env
): Promise<Response> {
  const results = await connectConfiguredQqOfficialGateways(env);
  return jsonResponse({ ok: results.every((result) => result.ok), results });
}
