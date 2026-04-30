export type PendingActionStatus = "pending" | "confirmed" | "executed" | "expired" | "cancelled";

export type PendingActionRecord = {
  id: string;
  agentId: string;
  runId: string;
  stepId: string;
  actorId: string;
  actorRole?: string;
  platform?: string;
  conversationId?: string;
  toolName: string;
  inputJson: string;
  status: PendingActionStatus;
  reason?: string;
  expiresAt: string;
  resultJson?: string;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  executedAt?: string;
};

export type PendingActionRow = {
  id: string;
  agent_id: string;
  run_id: string;
  step_id: string;
  actor_id: string;
  actor_role?: string;
  platform?: string;
  conversation_id?: string;
  tool_name: string;
  input_json: string;
  status: PendingActionStatus;
  reason?: string;
  expires_at: string;
  result_json?: string;
  error_code?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  executed_at?: string;
};

export function mapPendingActionRow(row: PendingActionRow): PendingActionRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    runId: row.run_id,
    stepId: row.step_id,
    actorId: row.actor_id,
    actorRole: row.actor_role ?? undefined,
    platform: row.platform ?? undefined,
    conversationId: row.conversation_id ?? undefined,
    toolName: row.tool_name,
    inputJson: row.input_json,
    status: row.status,
    reason: row.reason ?? undefined,
    expiresAt: row.expires_at,
    resultJson: row.result_json ?? undefined,
    errorCode: row.error_code ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at ?? undefined,
    executedAt: row.executed_at ?? undefined
  };
}
