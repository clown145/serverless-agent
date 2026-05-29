export const DEFAULT_MAX_TOOL_CALLS_PER_RUN = 20;
export const MIN_MAX_TOOL_CALLS_PER_RUN = 1;
export const MAX_TOOL_CALLS_PER_RUN_LIMIT = 100;

export const DEFAULT_MAX_MODEL_STEPS_PER_RUN = 50;
export const MIN_MAX_MODEL_STEPS_PER_RUN = 1;
export const MAX_MODEL_STEPS_PER_RUN_LIMIT = 500;

export type ToolSettingsRecord = {
  agentId: string;
  maxToolCallsPerRun: number;
  maxModelStepsPerRun: number;
  updatedAt?: string;
};

export type ToolSettingsRow = {
  agent_id: string;
  max_tool_calls_per_run?: number;
  max_model_steps_per_run?: number;
  updated_at?: string;
};

export function defaultToolSettings(agentId: string): ToolSettingsRecord {
  return {
    agentId,
    maxToolCallsPerRun: DEFAULT_MAX_TOOL_CALLS_PER_RUN,
    maxModelStepsPerRun: DEFAULT_MAX_MODEL_STEPS_PER_RUN
  };
}

export function mapToolSettingsRow(row: ToolSettingsRow): ToolSettingsRecord {
  return {
    agentId: row.agent_id,
    maxToolCallsPerRun: row.max_tool_calls_per_run ?? DEFAULT_MAX_TOOL_CALLS_PER_RUN,
    maxModelStepsPerRun: row.max_model_steps_per_run ?? DEFAULT_MAX_MODEL_STEPS_PER_RUN,
    updatedAt: row.updated_at
  };
}
