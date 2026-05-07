import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapSearchProviderCredentialRow,
  type SearchProviderCredentialRecord,
  type SearchProviderCredentialRow
} from "./search-types";

export type CreateSearchProviderCredentialInput = {
  providerId: string;
  encryptedValue: string;
  iv: string;
  algorithm: string;
};

export async function createSearchProviderCredentialRecord(
  db: D1Database,
  input: CreateSearchProviderCredentialInput
): Promise<SearchProviderCredentialRecord> {
  const id = createId("scred");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO search_provider_credentials (
        id, provider_id, encrypted_value, iv, algorithm, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, input.providerId, input.encryptedValue, input.iv, input.algorithm, now, now)
    .run();

  return {
    id,
    providerId: input.providerId,
    encryptedValue: input.encryptedValue,
    iv: input.iv,
    algorithm: input.algorithm,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

export async function getSearchProviderCredentialRecord(
  db: D1Database,
  id: string
): Promise<SearchProviderCredentialRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM search_provider_credentials WHERE id = ? AND status = 'active'")
    .bind(id)
    .first<SearchProviderCredentialRow>();

  return row ? mapSearchProviderCredentialRow(row) : undefined;
}
