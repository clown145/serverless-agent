import { nowIso } from "../../shared/time";
import {
  defaultToolSettings,
  mapToolSettingsRow,
  type ToolSettingsRecord,
  type ToolSettingsRow
} from "./tool-settings-types";

export async function getToolSettings(
  db: D1Database,
  agentId: string
): Promise<ToolSettingsRecord> {
  const row = await db
    .prepare("SELECT * FROM tool_settings WHERE agent_id = ?")
    .bind(agentId)
    .first<ToolSettingsRow>();

  return row ? mapToolSettingsRow(row) : defaultToolSettings(agentId);
}

export async function setToolSettings(
  db: D1Database,
  input: {
    agentId: string;
    maxToolCallsPerRun: number;
    maxModelStepsPerRun: number;
  }
): Promise<ToolSettingsRecord> {
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO tool_settings (agent_id, max_tool_calls_per_run, max_model_steps_per_run, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(agent_id) DO UPDATE SET
        max_tool_calls_per_run = excluded.max_tool_calls_per_run,
        max_model_steps_per_run = excluded.max_model_steps_per_run,
        updated_at = excluded.updated_at`
    )
    .bind(input.agentId, input.maxToolCallsPerRun, input.maxModelStepsPerRun, now)
    .run();

  return {
    agentId: input.agentId,
    maxToolCallsPerRun: input.maxToolCallsPerRun,
    maxModelStepsPerRun: input.maxModelStepsPerRun,
    updatedAt: now
  };
}
