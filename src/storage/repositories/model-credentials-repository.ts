import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapModelCredentialRow,
  type ModelCredentialRecord,
  type ModelCredentialRow
} from "./model-settings-types";

export type CreateModelCredentialInput = {
  providerId: string;
  encryptedValue: string;
  iv: string;
  algorithm: string;
};

export async function createModelCredentialRecord(
  db: D1Database,
  input: CreateModelCredentialInput
): Promise<ModelCredentialRecord> {
  const id = createId("mcred");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO model_credentials (
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

export async function getModelCredentialRecord(
  db: D1Database,
  id: string
): Promise<ModelCredentialRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM model_credentials WHERE id = ? AND status = 'active'")
    .bind(id)
    .first<ModelCredentialRow>();

  return row ? mapModelCredentialRow(row) : undefined;
}
