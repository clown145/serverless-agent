import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapMcpServerRow,
  type McpAuthType,
  type McpServerRecord,
  type McpServerRow,
  type McpTransport
} from "./mcp-types";

export type CreateMcpServerInput = {
  name: string;
  url: string;
  transport?: McpTransport;
  authType: McpAuthType;
  authHeader?: string;
};

export async function createMcpServerRecord(
  db: D1Database,
  input: CreateMcpServerInput
): Promise<McpServerRecord> {
  const id = createId("mcp");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO mcp_servers (
        id, name, url, transport, auth_type, auth_header, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(
      id,
      input.name,
      input.url,
      input.transport ?? "streamable-http",
      input.authType,
      input.authHeader ?? null,
      now,
      now
    )
    .run();

  return {
    id,
    name: input.name,
    url: input.url,
    transport: input.transport ?? "streamable-http",
    authType: input.authType,
    authHeader: input.authHeader,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

export async function listMcpServerRecords(db: D1Database): Promise<McpServerRecord[]> {
  const result = await db
    .prepare("SELECT * FROM mcp_servers WHERE status != 'deleted' ORDER BY created_at DESC")
    .all<McpServerRow>();

  return (result.results ?? []).map(mapMcpServerRow);
}

export async function getMcpServerRecord(
  db: D1Database,
  id: string
): Promise<McpServerRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM mcp_servers WHERE id = ? AND status != 'deleted'")
    .bind(id)
    .first<McpServerRow>();

  return row ? mapMcpServerRow(row) : undefined;
}

export async function updateMcpServerCredential(
  db: D1Database,
  id: string,
  credentialId: string
): Promise<McpServerRecord | undefined> {
  await db
    .prepare("UPDATE mcp_servers SET credential_id = ?, updated_at = ? WHERE id = ?")
    .bind(credentialId, nowIso(), id)
    .run();

  return getMcpServerRecord(db, id);
}

export async function recordMcpServerDiscovery(
  db: D1Database,
  id: string,
  input: {
    protocolVersion?: string;
    error?: string;
  }
): Promise<void> {
  await db
    .prepare(
      `UPDATE mcp_servers
      SET protocol_version = COALESCE(?, protocol_version),
        last_checked_at = ?,
        last_error = ?,
        updated_at = ?
      WHERE id = ?`
    )
    .bind(input.protocolVersion ?? null, nowIso(), input.error ?? null, nowIso(), id)
    .run();
}

export async function deleteMcpServerRecord(db: D1Database, id: string): Promise<boolean> {
  const result = await db
    .prepare("UPDATE mcp_servers SET status = 'deleted', updated_at = ? WHERE id = ?")
    .bind(nowIso(), id)
    .run();

  return Boolean(result.meta.changes);
}
