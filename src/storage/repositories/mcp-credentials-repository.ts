import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapMcpServerCredentialRow,
  type McpServerCredentialRecord,
  type McpServerCredentialRow
} from "./mcp-types";

export type CreateMcpServerCredentialInput = {
  serverId: string;
  encryptedValue: string;
  iv: string;
  algorithm: string;
};

export async function createMcpServerCredentialRecord(
  db: D1Database,
  input: CreateMcpServerCredentialInput
): Promise<McpServerCredentialRecord> {
  const id = createId("mcpcred");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO mcp_server_credentials (
        id, server_id, encrypted_value, iv, algorithm, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, input.serverId, input.encryptedValue, input.iv, input.algorithm, now, now)
    .run();

  return {
    id,
    serverId: input.serverId,
    encryptedValue: input.encryptedValue,
    iv: input.iv,
    algorithm: input.algorithm,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

export async function getMcpServerCredentialRecord(
  db: D1Database,
  id: string
): Promise<McpServerCredentialRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM mcp_server_credentials WHERE id = ? AND status = 'active'")
    .bind(id)
    .first<McpServerCredentialRow>();

  return row ? mapMcpServerCredentialRow(row) : undefined;
}
