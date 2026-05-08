import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapPlatformCredentialRow,
  type PlatformCredentialRecord,
  type PlatformCredentialRow
} from "./platform-integration-types";

export type CreatePlatformCredentialInput = {
  integrationId: string;
  encryptedValue: string;
  iv: string;
  algorithm: string;
};

export async function createPlatformCredentialRecord(
  db: D1Database,
  input: CreatePlatformCredentialInput
): Promise<PlatformCredentialRecord> {
  const id = createId("pcred");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO platform_credentials (
        id, integration_id, encrypted_value, iv, algorithm,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, input.integrationId, input.encryptedValue, input.iv, input.algorithm, now, now)
    .run();

  return {
    id,
    integrationId: input.integrationId,
    encryptedValue: input.encryptedValue,
    iv: input.iv,
    algorithm: input.algorithm,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

export async function getPlatformCredentialRecord(
  db: D1Database,
  id: string
): Promise<PlatformCredentialRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM platform_credentials WHERE id = ? AND status = 'active'")
    .bind(id)
    .first<PlatformCredentialRow>();

  return row ? mapPlatformCredentialRow(row) : undefined;
}
