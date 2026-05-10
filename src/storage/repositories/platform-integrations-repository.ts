import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapPlatformIntegrationRow,
  type PlatformIntegrationPlatform,
  type PlatformIntegrationRecord,
  type PlatformIntegrationRow
} from "./platform-integration-types";

export type CreatePlatformIntegrationInput = {
  agentId: string;
  platform: PlatformIntegrationPlatform;
  name: string;
  config?: Record<string, unknown>;
  webhookSecret?: string;
};

export async function createPlatformIntegrationRecord(
  db: D1Database,
  input: CreatePlatformIntegrationInput
): Promise<PlatformIntegrationRecord> {
  const id = createId("pint");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO platform_integrations (
        id, agent_id, platform, name, config_json, webhook_secret,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(
      id,
      input.agentId,
      input.platform,
      input.name,
      JSON.stringify(input.config ?? {}),
      input.webhookSecret ?? null,
      now,
      now
    )
    .run();

  return {
    id,
    agentId: input.agentId,
    platform: input.platform,
    name: input.name,
    config: input.config ?? {},
    webhookSecret: input.webhookSecret,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

export async function listPlatformIntegrationRecords(
  db: D1Database,
  input: { platform?: PlatformIntegrationPlatform; agentId?: string } = {}
): Promise<PlatformIntegrationRecord[]> {
  const query = input.platform
    ? db
        .prepare(
          `SELECT * FROM platform_integrations
           WHERE platform = ? AND status != 'deleted'
           ORDER BY created_at DESC`
        )
        .bind(input.platform)
    : db
        .prepare(
          `SELECT * FROM platform_integrations
           WHERE status != 'deleted'
           ORDER BY platform ASC, created_at DESC`
        );
  const result = await query.all<PlatformIntegrationRow>();
  const records = (result.results ?? []).map(mapPlatformIntegrationRow);

  return input.agentId
    ? records.filter((record) => record.agentId === input.agentId)
    : records;
}

export async function getPlatformIntegrationRecord(
  db: D1Database,
  id: string
): Promise<PlatformIntegrationRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM platform_integrations WHERE id = ? AND status != 'deleted'")
    .bind(id)
    .first<PlatformIntegrationRow>();

  return row ? mapPlatformIntegrationRow(row) : undefined;
}

export async function findActivePlatformIntegration(
  db: D1Database,
  input: { agentId: string; platform: PlatformIntegrationPlatform }
): Promise<PlatformIntegrationRecord | undefined> {
  const row = await db
    .prepare(
      `SELECT * FROM platform_integrations
       WHERE agent_id = ? AND platform = ? AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .bind(input.agentId, input.platform)
    .first<PlatformIntegrationRow>();

  return row ? mapPlatformIntegrationRow(row) : undefined;
}

export async function findPlatformIntegrationByWebhookSecret(
  db: D1Database,
  input: { platform: PlatformIntegrationPlatform; webhookSecret: string }
): Promise<PlatformIntegrationRecord | undefined> {
  const row = await db
    .prepare(
      `SELECT * FROM platform_integrations
       WHERE platform = ? AND webhook_secret = ? AND status = 'active'
       LIMIT 1`
    )
    .bind(input.platform, input.webhookSecret)
    .first<PlatformIntegrationRow>();

  return row ? mapPlatformIntegrationRow(row) : undefined;
}

export async function updatePlatformIntegrationCredential(
  db: D1Database,
  id: string,
  credentialId: string
): Promise<PlatformIntegrationRecord | undefined> {
  await db
    .prepare("UPDATE platform_integrations SET credential_id = ?, updated_at = ? WHERE id = ?")
    .bind(credentialId, nowIso(), id)
    .run();

  return getPlatformIntegrationRecord(db, id);
}

export async function updatePlatformIntegrationConfig(
  db: D1Database,
  id: string,
  config: Record<string, unknown>
): Promise<PlatformIntegrationRecord | undefined> {
  await db
    .prepare("UPDATE platform_integrations SET config_json = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(config), nowIso(), id)
    .run();

  return getPlatformIntegrationRecord(db, id);
}

export async function updatePlatformIntegrationCheck(
  db: D1Database,
  id: string,
  input: { lastError?: string }
): Promise<void> {
  await db
    .prepare(
      `UPDATE platform_integrations
       SET last_checked_at = ?, last_error = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(nowIso(), input.lastError ?? null, nowIso(), id)
    .run();
}

export async function deletePlatformIntegrationRecord(
  db: D1Database,
  id: string
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE platform_integrations SET status = 'deleted', updated_at = ? WHERE id = ?")
    .bind(nowIso(), id)
    .run();

  return Boolean(result.meta.changes);
}
