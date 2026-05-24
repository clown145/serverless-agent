import type { McpServerRecord, McpToolRecord } from "../../../storage/repositories/mcp-types";

export type McpServerDto = Omit<McpServerRecord, "credentialId"> & {
  hasCredential: boolean;
};

export function toMcpServerDto(server: McpServerRecord): McpServerDto {
  return {
    id: server.id,
    name: server.name,
    url: server.url,
    transport: server.transport,
    authType: server.authType,
    authHeader: server.authHeader,
    protocolVersion: server.protocolVersion,
    status: server.status,
    lastCheckedAt: server.lastCheckedAt,
    lastError: server.lastError,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
    hasCredential: Boolean(server.credentialId)
  };
}

export function toMcpToolDto(tool: McpToolRecord): McpToolRecord {
  return tool;
}
