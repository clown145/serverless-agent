import { nowIso } from "../../shared/time";
import {
  mapModelSettingsRow,
  type ModelSettingsRecord,
  type ModelSettingsRow
} from "./model-settings-types";

export async function getModelSettings(
  db: D1Database,
  agentId: string
): Promise<ModelSettingsRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM model_settings WHERE agent_id = ?")
    .bind(agentId)
    .first<ModelSettingsRow>();

  return row ? mapModelSettingsRow(row) : undefined;
}

export async function setModelSettings(
  db: D1Database,
  input: {
    agentId: string;
    providerId: string;
    modelId: string;
  }
): Promise<ModelSettingsRecord> {
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO model_settings (agent_id, provider_id, model_id, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(agent_id) DO UPDATE SET
         provider_id = excluded.provider_id,
         model_id = excluded.model_id,
         updated_at = excluded.updated_at`
    )
    .bind(input.agentId, input.providerId, input.modelId, now)
    .run();

  return {
    agentId: input.agentId,
    providerId: input.providerId,
    modelId: input.modelId,
    updatedAt: now
  };
}
