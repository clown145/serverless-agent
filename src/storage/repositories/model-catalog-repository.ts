import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  inferModelCapabilities,
  uniqueCapabilities,
  type ModelCapability
} from "../../core/model/capability-defaults";
import {
  mapModelCatalogRow,
  type ModelCatalogRecord,
  type ModelCatalogRow
} from "./model-settings-types";

export async function upsertModelCatalog(
  db: D1Database,
  input: {
    providerId: string;
    models: Array<{ modelId: string; displayName?: string }>;
  }
): Promise<ModelCatalogRecord[]> {
  const now = nowIso();

  for (const model of input.models) {
    const id = createId("model");
    await db
      .prepare(
        `INSERT INTO model_catalog (
          id, provider_id, model_id, display_name, capabilities_json,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'available', ?, ?)
        ON CONFLICT(provider_id, model_id) DO UPDATE SET
          display_name = excluded.display_name,
          status = 'available',
          updated_at = excluded.updated_at`
      )
      .bind(
        id,
        input.providerId,
        model.modelId,
        model.displayName ?? null,
        JSON.stringify(inferModelCapabilities(model.modelId)),
        now,
        now
      )
      .run();
  }

  return listModelCatalog(db, input.providerId);
}

export async function listModelCatalog(
  db: D1Database,
  providerId?: string
): Promise<ModelCatalogRecord[]> {
  const query = providerId
    ? db
        .prepare("SELECT * FROM model_catalog WHERE provider_id = ? ORDER BY model_id ASC")
        .bind(providerId)
    : db.prepare("SELECT * FROM model_catalog ORDER BY provider_id ASC, model_id ASC");
  const result = await query.all<ModelCatalogRow>();

  return (result.results ?? []).map(mapModelCatalogRow);
}

export async function updateModelCatalogCapabilities(
  db: D1Database,
  id: string,
  capabilities: ModelCapability[]
): Promise<ModelCatalogRecord | undefined> {
  await db
    .prepare(
      `UPDATE model_catalog
       SET capabilities_json = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(JSON.stringify(uniqueCapabilities(capabilities)), nowIso(), id)
    .run();

  return getModelCatalogRecord(db, id);
}

export async function getModelCatalogRecord(
  db: D1Database,
  id: string
): Promise<ModelCatalogRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM model_catalog WHERE id = ?")
    .bind(id)
    .first<ModelCatalogRow>();

  return row ? mapModelCatalogRow(row) : undefined;
}
