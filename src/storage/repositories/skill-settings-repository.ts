import { nowIso } from "../../shared/time";

export type SkillSettingsRecord = {
  agentId: string;
  editConfirmationRequired: boolean;
  updatedAt?: string;
};

type SkillSettingsRow = {
  agent_id: string;
  edit_confirmation_required: number;
  updated_at: string;
};

export async function getSkillSettings(
  db: D1Database,
  agentId: string
): Promise<SkillSettingsRecord> {
  const row = await db
    .prepare("SELECT * FROM skill_settings WHERE agent_id = ?")
    .bind(agentId)
    .first<SkillSettingsRow>();

  return row ? mapSkillSettingsRow(row) : defaultSkillSettings(agentId);
}

export async function setSkillEditConfirmationRequired(
  db: D1Database,
  input: {
    agentId: string;
    required: boolean;
  }
): Promise<SkillSettingsRecord> {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO skill_settings (
        agent_id, edit_confirmation_required, updated_at
      ) VALUES (?, ?, ?)
      ON CONFLICT(agent_id)
      DO UPDATE SET
        edit_confirmation_required = excluded.edit_confirmation_required,
        updated_at = excluded.updated_at`
    )
    .bind(input.agentId, input.required ? 1 : 0, now)
    .run();

  return {
    agentId: input.agentId,
    editConfirmationRequired: input.required,
    updatedAt: now
  };
}

function defaultSkillSettings(agentId: string): SkillSettingsRecord {
  return {
    agentId,
    editConfirmationRequired: true
  };
}

function mapSkillSettingsRow(row: SkillSettingsRow): SkillSettingsRecord {
  return {
    agentId: row.agent_id,
    editConfirmationRequired: row.edit_confirmation_required === 1,
    updatedAt: row.updated_at
  };
}
