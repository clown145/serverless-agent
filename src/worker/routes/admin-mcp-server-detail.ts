import { resolveMcpCredential } from "../../tools/mcp/credential";
import { discoverMcpHttpTools } from "../../tools/mcp/http-client";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  deleteMcpServerRecord,
  getMcpServerRecord,
  recordMcpServerDiscovery
} from "../../storage/repositories/mcp-servers-repository";
import { upsertMcpToolCatalog } from "../../storage/repositories/mcp-tools-repository";
import { requireAdmin } from "../admin-auth";
import { toMcpToolDto } from "./mcp/mcp-dto";

export async function handleAdminMcpServerDetail(
  request: Request,
  env: Env,
  serverId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "DELETE") {
    const deleted = await deleteMcpServerRecord(env.AGENT_DB, serverId);
    if (!deleted) {
      return errorResponse(404, "mcp_server_not_found", "MCP server not found");
    }

    return jsonResponse({ ok: true, deleted });
  }

  const pathname = new URL(request.url).pathname;
  if (request.method === "POST" && pathname.endsWith("/discover")) {
    const server = await getMcpServerRecord(env.AGENT_DB, serverId);
    if (!server) {
      return errorResponse(404, "mcp_server_not_found", "MCP server not found");
    }

    try {
      const credential = await resolveMcpCredential(env, server);
      const discovery = await discoverMcpHttpTools({
        url: server.url,
        auth: {
          authType: server.authType,
          authHeader: server.authHeader,
          credential
        }
      });
      const tools = await upsertMcpToolCatalog(env.AGENT_DB, {
        serverId,
        tools: discovery.tools
      });
      await recordMcpServerDiscovery(env.AGENT_DB, serverId, {
        protocolVersion: discovery.protocolVersion
      });

      return jsonResponse({
        ok: true,
        protocolVersion: discovery.protocolVersion,
        tools: tools.map(toMcpToolDto)
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to discover MCP tools";
      await recordMcpServerDiscovery(env.AGENT_DB, serverId, { error: message });
      return errorResponse(502, "mcp_discovery_failed", message);
    }
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
