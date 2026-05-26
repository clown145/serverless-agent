import { nowIso } from "../../shared/time";

export type AgentModelConfigRecord = {
  agentId: string;
  imageCaptionEnabled: boolean;
  maxToolSteps: number;
  updatedAt?: string;
};

type AgentModelConfigRow = {
  agent_id: string;
  image_caption_enabled?: number | null;
  max_tool_steps?: number | null;
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
    maxToolSteps?: number;
  }
): Promise<AgentModelConfigRecord> {
  const now = nowIso();
  const maxToolSteps = input.maxToolSteps ?? 6;

  await db
    .prepare(
      `INSERT INTO agent_model_config (agent_id, image_caption_enabled, max_tool_steps, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(agent_id) DO UPDATE SET
         image_caption_enabled = excluded.image_caption_enabled,
         max_tool_steps = excluded.max_tool_steps,
         updated_at = excluded.updated_at`
    )
    .bind(input.agentId, input.imageCaptionEnabled ? 1 : 0, maxToolSteps, now)
    .run();

  return {
    agentId: input.agentId,
    imageCaptionEnabled: input.imageCaptionEnabled,
    maxToolSteps,
    updatedAt: now
  };
}

function defaultAgentModelConfig(agentId: string): AgentModelConfigRecord {
  return {
    agentId,
    imageCaptionEnabled: false,
    maxToolSteps: 6
  };
}

function mapAgentModelConfigRow(row: AgentModelConfigRow): AgentModelConfigRecord {
  return {
    agentId: row.agent_id,
    imageCaptionEnabled: row.image_caption_enabled === 1,
    maxToolSteps: row.max_tool_steps ?? 6,
    updatedAt: row.updated_at ?? undefined
  };
}
