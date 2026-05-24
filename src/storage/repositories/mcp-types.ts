import type { JsonSchema } from "../../core/model/types";
import type { ToolAnnotations } from "../../tools/types";

export type McpTransport = "streamable-http";

export type McpAuthType = "none" | "bearer" | "api-key-header";

export type McpServerRecord = {
  id: string;
  name: string;
  url: string;
  transport: McpTransport;
  authType: McpAuthType;
  authHeader?: string;
  credentialId?: string;
  protocolVersion?: string;
  status: string;
  lastCheckedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type McpServerCredentialRecord = {
  id: string;
  serverId: string;
  encryptedValue: string;
  iv: string;
  algorithm: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type McpToolRecord = {
  id: string;
  serverId: string;
  toolName: string;
  internalName: string;
  title?: string;
  description?: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: ToolAnnotations;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type McpServerRow = {
  id: string;
  name: string;
  url: string;
  transport: McpTransport;
  auth_type: McpAuthType;
  auth_header?: string;
  credential_id?: string;
  protocol_version?: string;
  status: string;
  last_checked_at?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
};

export type McpServerCredentialRow = {
  id: string;
  server_id: string;
  encrypted_value: string;
  iv: string;
  algorithm: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type McpToolRow = {
  id: string;
  server_id: string;
  tool_name: string;
  internal_name: string;
  title?: string;
  description?: string;
  input_schema_json: string;
  output_schema_json?: string;
  annotations_json?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export function mapMcpServerRow(row: McpServerRow): McpServerRecord {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    transport: row.transport,
    authType: row.auth_type,
    authHeader: row.auth_header ?? undefined,
    credentialId: row.credential_id ?? undefined,
    protocolVersion: row.protocol_version ?? undefined,
    status: row.status,
    lastCheckedAt: row.last_checked_at ?? undefined,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapMcpServerCredentialRow(row: McpServerCredentialRow): McpServerCredentialRecord {
  return {
    id: row.id,
    serverId: row.server_id,
    encryptedValue: row.encrypted_value,
    iv: row.iv,
    algorithm: row.algorithm,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapMcpToolRow(row: McpToolRow): McpToolRecord {
  return {
    id: row.id,
    serverId: row.server_id,
    toolName: row.tool_name,
    internalName: row.internal_name,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    inputSchema: parseJsonSchema(row.input_schema_json),
    outputSchema: row.output_schema_json ? parseJsonSchema(row.output_schema_json) : undefined,
    annotations: row.annotations_json
      ? (JSON.parse(row.annotations_json) as ToolAnnotations)
      : undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseJsonSchema(value: string): JsonSchema {
  return JSON.parse(value) as JsonSchema;
}
