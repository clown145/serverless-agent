import { nowIso } from "../../shared/time";
import {
  mapModelRoleSettingRow,
  type ModelRole,
  type ModelRoleSettingRecord,
  type ModelRoleSettingRow
} from "./model-settings-types";

export type ModelRoleSelection = {
  providerId?: string;
  modelId?: string;
};

export async function listModelRoleSettings(
  db: D1Database,
  agentId: string
): Promise<ModelRoleSettingRecord[]> {
  const result = await db
    .prepare("SELECT * FROM agent_model_role_settings WHERE agent_id = ?")
    .bind(agentId)
    .all<ModelRoleSettingRow>();

  return (result.results ?? [])
    .map(mapModelRoleSettingRow)
    .filter((item): item is ModelRoleSettingRecord => Boolean(item));
}

export async function getModelRoleSetting(
  db: D1Database,
  agentId: string,
  role: ModelRole
): Promise<ModelRoleSettingRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM agent_model_role_settings WHERE agent_id = ? AND role = ?")
    .bind(agentId, role)
    .first<ModelRoleSettingRow>();

  return row ? mapModelRoleSettingRow(row) : undefined;
}

export async function setModelRoleSetting(
  db: D1Database,
  input: {
    agentId: string;
    role: ModelRole;
    providerId: string;
    modelId: string;
  }
): Promise<ModelRoleSettingRecord> {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO agent_model_role_settings (agent_id, role, provider_id, model_id, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(agent_id, role) DO UPDATE SET
         provider_id = excluded.provider_id,
         model_id = excluded.model_id,
         updated_at = excluded.updated_at`
    )
    .bind(input.agentId, input.role, input.providerId, input.modelId, now)
    .run();

  return {
    agentId: input.agentId,
    role: input.role,
    providerId: input.providerId,
    modelId: input.modelId,
    updatedAt: now
  };
}

export async function clearModelRoleSetting(
  db: D1Database,
  agentId: string,
  role: ModelRole
): Promise<void> {
  await db
    .prepare("DELETE FROM agent_model_role_settings WHERE agent_id = ? AND role = ?")
    .bind(agentId, role)
    .run();
}

export function roleSettingsByRole(
  settings: ModelRoleSettingRecord[]
): Partial<Record<ModelRole, ModelRoleSelection>> {
  return settings.reduce<Partial<Record<ModelRole, ModelRoleSelection>>>((grouped, setting) => {
    grouped[setting.role] = {
      providerId: setting.providerId,
      modelId: setting.modelId
    };
    return grouped;
  }, {});
}
