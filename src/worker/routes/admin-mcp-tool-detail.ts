import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { updateMcpToolStatus } from "../../storage/repositories/mcp-tools-repository";
import { requireAdmin } from "../admin-auth";
import { toMcpToolDto } from "./mcp/mcp-dto";
import {
  updateMcpToolStatusSchema,
  zodMessage
} from "./mcp/mcp-tool-schemas";

export async function handleAdminMcpToolDetail(
  request: Request,
  env: Env,
  toolId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method !== "PUT") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const parsed = updateMcpToolStatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const tool = await updateMcpToolStatus(env.AGENT_DB, toolId, parsed.data.status);
  if (!tool) {
    return errorResponse(404, "mcp_tool_not_found", "MCP tool not found");
  }

  return jsonResponse({ ok: true, tool: toMcpToolDto(tool) });
}
