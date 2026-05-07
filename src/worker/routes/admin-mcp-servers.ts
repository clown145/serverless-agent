import { encryptMcpCredential } from "../../tools/mcp/credential";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { createMcpServerCredentialRecord } from "../../storage/repositories/mcp-credentials-repository";
import {
  createMcpServerRecord,
  listMcpServerRecords,
  updateMcpServerCredential
} from "../../storage/repositories/mcp-servers-repository";
import { listMcpToolCatalog } from "../../storage/repositories/mcp-tools-repository";
import { requireAdmin } from "../admin-auth";
import { toMcpServerDto, toMcpToolDto } from "./mcp/mcp-dto";
import { createMcpServerSchema, zodMessage } from "./mcp/mcp-schemas";

export async function handleAdminMcpServers(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "GET") {
    const [servers, tools] = await Promise.all([
      listMcpServerRecords(env.AGENT_DB),
      listMcpToolCatalog(env.AGENT_DB)
    ]);

    return jsonResponse({
      ok: true,
      servers: servers.map(toMcpServerDto),
      tools: tools.map(toMcpToolDto)
    });
  }

  if (request.method === "POST") {
    const parsed = createMcpServerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    if (
      parsed.data.authType === "api-key-header" &&
      !parsed.data.authHeader?.trim()
    ) {
      return errorResponse(
        400,
        "missing_auth_header",
        "Auth header is required for API key header auth"
      );
    }

    if (parsed.data.authType !== "none" && !parsed.data.credential?.trim()) {
      return errorResponse(
        400,
        "missing_mcp_credential",
        "Credential is required unless auth is none"
      );
    }

    let server = await createMcpServerRecord(env.AGENT_DB, {
      name: parsed.data.name,
      url: parsed.data.url,
      authType: parsed.data.authType,
      authHeader: parsed.data.authHeader
    });

    if (parsed.data.credential) {
      try {
        const encrypted = await encryptMcpCredential(env, parsed.data.credential);
        const credential = await createMcpServerCredentialRecord(env.AGENT_DB, {
          serverId: server.id,
          encryptedValue: encrypted.encryptedValue,
          iv: encrypted.iv,
          algorithm: encrypted.algorithm
        });
        server =
          (await updateMcpServerCredential(env.AGENT_DB, server.id, credential.id)) ??
          server;
      } catch (error) {
        return errorResponse(
          400,
          "credential_encryption_unavailable",
          error instanceof Error ? error.message : "Unable to encrypt MCP credential"
        );
      }
    }

    return jsonResponse({ ok: true, server: toMcpServerDto(server) }, { status: 201 });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
