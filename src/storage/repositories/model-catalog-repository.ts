import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  inferModelCapabilities,
  uniqueCapabilities,
  type ModelCapability
} from "../../core/model/capability-defaults";
import {
  mergeModelMetadata,
  type ModelMetadataResolution
} from "../../core/model/model-metadata";
import {
  mapModelCatalogRow,
  type ModelCatalogRecord,
  type ModelCatalogRow,
  type ModelCatalogStatus
} from "./model-settings-types";

export async function upsertModelCatalog(
  db: D1Database,
  input: {
    providerId: string;
    models: Array<{ modelId: string; displayName?: string }>;
  }
): Promise<ModelCatalogRecord[]> {
  const now = nowIso();
  const existingModels = await listModelCatalog(db, input.providerId);
  const existingStatusByModelId = new Map(
    existingModels.map((model) => [model.modelId, model.status])
  );
  const existingCapabilitiesSourceByModelId = new Map(
    existingModels.map((model) => [model.modelId, model.capabilitiesSource])
  );

  await db
    .prepare(
      `UPDATE model_catalog
       SET status = 'unavailable', updated_at = ?
       WHERE provider_id = ?`
    )
    .bind(now, input.providerId)
    .run();

  for (const model of input.models) {
    const id = createId("model");
    const status = refreshedModelStatus(existingStatusByModelId.get(model.modelId));
    const capabilitiesSource =
      existingCapabilitiesSourceByModelId.get(model.modelId) ?? "inferred";
    await db
      .prepare(
        `INSERT INTO model_catalog (
          id, provider_id, model_id, display_name, capabilities_json, capabilities_source,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider_id, model_id) DO UPDATE SET
          display_name = excluded.display_name,
          status = excluded.status,
          updated_at = excluded.updated_at`
      )
      .bind(
        id,
        input.providerId,
        model.modelId,
        model.displayName ?? null,
        JSON.stringify(inferModelCapabilities(model.modelId)),
        capabilitiesSource,
        status,
        now,
        now
      )
      .run();
  }

  return listModelCatalog(db, input.providerId);
}

function refreshedModelStatus(status?: ModelCatalogStatus): ModelCatalogStatus {
  if (status === "enabled" || status === "disabled") {
    return status;
  }

  return "available";
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

export async function listEnabledModelCatalog(
  db: D1Database,
  providerId?: string
): Promise<ModelCatalogRecord[]> {
  const query = providerId
    ? db
        .prepare(
          `SELECT * FROM model_catalog
           WHERE provider_id = ? AND status = 'enabled'
           ORDER BY model_id ASC`
        )
        .bind(providerId)
    : db.prepare(
        `SELECT * FROM model_catalog
         WHERE status = 'enabled'
         ORDER BY provider_id ASC, model_id ASC`
      );
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
       SET capabilities_json = ?, capabilities_source = 'manual', updated_at = ?
       WHERE id = ?`
    )
    .bind(JSON.stringify(uniqueCapabilities(capabilities)), nowIso(), id)
    .run();

  return getModelCatalogRecord(db, id);
}

export async function updateModelCatalogMetadata(
  db: D1Database,
  input: {
    providerId: string;
    metadataByModelId: Map<string, ModelMetadataResolution>;
  }
): Promise<ModelCatalogRecord[]> {
  const now = nowIso();
  const models = await listModelCatalog(db, input.providerId);

  for (const model of models) {
    const matchedMetadata = input.metadataByModelId.get(model.modelId);
    if (!matchedMetadata) {
      continue;
    }

    const metadata = mergeModelMetadata(
      model.modelId,
      matchedMetadata
    );
    const capabilities =
      model.capabilitiesSource === "manual" ? model.capabilities : metadata.capabilities;
    const capabilitiesSource =
      model.capabilitiesSource === "manual" ? "manual" : metadata.source;

    await db
      .prepare(
        `UPDATE model_catalog
         SET
           capabilities_json = ?,
           capabilities_source = ?,
           context_window = ?,
           max_output_tokens = ?,
           metadata_json = ?,
           metadata_source = ?,
           metadata_confidence = ?,
           metadata_fetched_at = ?,
           updated_at = ?
         WHERE id = ?`
      )
      .bind(
        JSON.stringify(uniqueCapabilities(capabilities)),
        capabilitiesSource,
        metadata.contextWindow ?? null,
        metadata.maxOutputTokens ?? null,
        metadata.raw ? JSON.stringify(metadata.raw) : null,
        metadata.source,
        metadata.confidence,
        now,
        now,
        model.id
      )
      .run();
  }

  return listModelCatalog(db, input.providerId);
}

export async function updateModelCatalogStatus(
  db: D1Database,
  id: string,
  status: Exclude<ModelCatalogStatus, "unavailable">
): Promise<ModelCatalogRecord | undefined> {
  await db
    .prepare(
      `UPDATE model_catalog
       SET status = ?, updated_at = ?
       WHERE id = ? AND status != 'unavailable'`
    )
    .bind(status, nowIso(), id)
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
