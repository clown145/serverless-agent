import { nowIso } from "../../shared/time";

export type AgentModelConfigRecord = {
  agentId: string;
  imageCaptionEnabled: boolean;
  updatedAt?: string;
};

type AgentModelConfigRow = {
  agent_id: string;
  image_caption_enabled?: number | null;
  updated_at?: string | null;
};

export async function getAgentModelConfig(
  db: D1Database,
  agentId: string
): Promise<AgentModelConfigRecord> {
  const row = await db
    .prepare("SELECT * FROM agent_model_config WHERE agent_id = ?")
    .bind(agentId)
    .first<AgentModelConfigRow>();

  return row ? mapAgentModelConfigRow(row) : defaultAgentModelConfig(agentId);
}

export async function setAgentModelConfig(
  db: D1Database,
  input: {
    agentId: string;
    imageCaptionEnabled: boolean;
  }
): Promise<AgentModelConfigRecord> {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO agent_model_config (agent_id, image_caption_enabled, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(agent_id) DO UPDATE SET
         image_caption_enabled = excluded.image_caption_enabled,
         updated_at = excluded.updated_at`
    )
    .bind(input.agentId, input.imageCaptionEnabled ? 1 : 0, now)
    .run();

  return {
    agentId: input.agentId,
    imageCaptionEnabled: input.imageCaptionEnabled,
    updatedAt: now
  };
}

function defaultAgentModelConfig(agentId: string): AgentModelConfigRecord {
  return {
    agentId,
    imageCaptionEnabled: false
  };
}

function mapAgentModelConfigRow(row: AgentModelConfigRow): AgentModelConfigRecord {
  return {
    agentId: row.agent_id,
    imageCaptionEnabled: row.image_caption_enabled === 1,
    updatedAt: row.updated_at ?? undefined
  };
}
