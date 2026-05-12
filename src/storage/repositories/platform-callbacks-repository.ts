import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapPlatformCallbackRow,
  type PlatformCallbackRecord,
  type PlatformCallbackRow
} from "./platform-callbacks-types";

export type CreatePlatformCallbackInput = {
  agentId: string;
  platform: string;
  conversationId: string;
  action: string;
  payloadJson: string;
  expiresAt: string;
};

export async function createPlatformCallback(
  db: D1Database,
  input: CreatePlatformCallbackInput
): Promise<PlatformCallbackRecord> {
  const id = createId("cb");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO platform_callbacks (
        id, agent_id, platform, conversation_id, action, payload_json,
        status, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
    )
    .bind(
      id,
      input.agentId,
      input.platform,
      input.conversationId,
      input.action,
      input.payloadJson,
      input.expiresAt,
      now,
      now
    )
    .run();

  return {
    id,
    agentId: input.agentId,
    platform: input.platform,
    conversationId: input.conversationId,
    action: input.action,
    payloadJson: input.payloadJson,
    status: "active",
    expiresAt: input.expiresAt,
    createdAt: now,
    updatedAt: now
  };
}

export async function getPlatformCallback(
  db: D1Database,
  id: string
): Promise<PlatformCallbackRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM platform_callbacks WHERE id = ?")
    .bind(id)
    .first<PlatformCallbackRow>();

  return row ? mapPlatformCallbackRow(row) : undefined;
}

export async function markPlatformCallbackUsed(
  db: D1Database,
  id: string
): Promise<boolean> {
  const now = nowIso();
  const result = await db
    .prepare(
      `UPDATE platform_callbacks
       SET status = 'used', used_at = ?, updated_at = ?
       WHERE id = ? AND status = 'active'`
    )
    .bind(now, now, id)
    .run();

  return Boolean(result.meta.changes);
}

export async function expirePlatformCallback(
  db: D1Database,
  id: string
): Promise<void> {
  const now = nowIso();
  await db
    .prepare(
      `UPDATE platform_callbacks
       SET status = 'expired', updated_at = ?
       WHERE id = ? AND status = 'active'`
    )
    .bind(now, id)
    .run();
}
