import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { ModelProviderType } from "./model-settings-types";
import {
  mapModelProviderRow,
  type ModelProviderRecord,
  type ModelProviderRow
} from "./model-settings-types";

export type CreateModelProviderInput = {
  name: string;
  providerType: ModelProviderType;
  baseUrl?: string;
  apiKeySecret: string;
};

export async function createModelProviderRecord(
  db: D1Database,
  input: CreateModelProviderInput
): Promise<ModelProviderRecord> {
  const id = createId("mprov");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO model_providers (
        id, name, provider_type, base_url, api_key_secret, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, input.name, input.providerType, input.baseUrl ?? null, input.apiKeySecret, now, now)
    .run();

  return {
    id,
    name: input.name,
    providerType: input.providerType,
    baseUrl: input.baseUrl,
    apiKeySecret: input.apiKeySecret,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

export async function listModelProviders(
  db: D1Database
): Promise<ModelProviderRecord[]> {
  const result = await db
    .prepare("SELECT * FROM model_providers WHERE status != 'deleted' ORDER BY created_at DESC")
    .all<ModelProviderRow>();

  return (result.results ?? []).map(mapModelProviderRow);
}

export async function getModelProviderRecord(
  db: D1Database,
  id: string
): Promise<ModelProviderRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM model_providers WHERE id = ? AND status != 'deleted'")
    .bind(id)
    .first<ModelProviderRow>();

  return row ? mapModelProviderRow(row) : undefined;
}

export async function deleteModelProviderRecord(
  db: D1Database,
  id: string
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE model_providers SET status = 'deleted', updated_at = ? WHERE id = ?")
    .bind(nowIso(), id)
    .run();

  return Boolean(result.meta.changes);
}
