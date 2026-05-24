import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapSearchProviderRow,
  type SearchProviderRecord,
  type SearchProviderRow,
  type SearchProviderType
} from "./search-types";

export type CreateSearchProviderInput = {
  name: string;
  providerType: SearchProviderType;
  baseUrl?: string;
};

export async function createSearchProviderRecord(
  db: D1Database,
  input: CreateSearchProviderInput
): Promise<SearchProviderRecord> {
  const id = createId("sprov");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO search_providers (
        id, name, provider_type, base_url, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, input.name, input.providerType, input.baseUrl ?? null, now, now)
    .run();

  return {
    id,
    name: input.name,
    providerType: input.providerType,
    baseUrl: input.baseUrl,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

export async function listSearchProviderRecords(db: D1Database): Promise<SearchProviderRecord[]> {
  const result = await db
    .prepare("SELECT * FROM search_providers WHERE status != 'deleted' ORDER BY created_at DESC")
    .all<SearchProviderRow>();

  return (result.results ?? []).map(mapSearchProviderRow);
}

export async function getSearchProviderRecord(
  db: D1Database,
  id: string
): Promise<SearchProviderRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM search_providers WHERE id = ? AND status != 'deleted'")
    .bind(id)
    .first<SearchProviderRow>();

  return row ? mapSearchProviderRow(row) : undefined;
}

export async function updateSearchProviderCredential(
  db: D1Database,
  id: string,
  credentialId: string
): Promise<SearchProviderRecord | undefined> {
  await db
    .prepare("UPDATE search_providers SET credential_id = ?, updated_at = ? WHERE id = ?")
    .bind(credentialId, nowIso(), id)
    .run();

  return getSearchProviderRecord(db, id);
}

export async function deleteSearchProviderRecord(db: D1Database, id: string): Promise<boolean> {
  const result = await db
    .prepare("UPDATE search_providers SET status = 'deleted', updated_at = ? WHERE id = ?")
    .bind(nowIso(), id)
    .run();

  return Boolean(result.meta.changes);
}
