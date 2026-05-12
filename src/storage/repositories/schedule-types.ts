import type { Platform, SenderRole } from "../../shared/types/internal-message";

export type ScheduleStatus = "active" | "paused" | "completed" | "cancelled" | "failed";
export type ScheduleRunStatus = "completed" | "failed" | "cancelled";

export type ScheduleRecord = {
  id: string;
  agentId: string;
  status: ScheduleStatus;
  title?: string;
  dueAt: string;
  intervalSeconds?: number;
  platform?: Platform;
  conversationId?: string;
  actorId?: string;
  actorRole?: SenderRole;
  modelProviderId?: string;
  modelId?: string;
  maxAttempts: number;
  attemptCount: number;
  retryDelaySeconds: number;
  payloadJson: string;
  lastRunAt?: string;
  lastError?: string;
  lastRunId?: string;
  executionProfileJson?: string;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleRow = {
  id: string;
  agent_id: string;
  status: ScheduleStatus;
  title?: string | null;
  due_at: string;
  interval_seconds?: number;
  platform?: Platform | null;
  conversation_id?: string | null;
  actor_id?: string | null;
  actor_role?: SenderRole | null;
  model_provider_id?: string | null;
  model_id?: string | null;
  max_attempts?: number | null;
  attempt_count?: number | null;
  retry_delay_seconds?: number | null;
  payload_json: string;
  last_run_at?: string | null;
  last_error?: string | null;
  last_run_id?: string | null;
  execution_profile_json?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateScheduleInput = {
  agentId: string;
  title?: string;
  dueAt: string;
  intervalSeconds?: number;
  platform?: Platform;
  conversationId?: string;
  actorId?: string;
  actorRole?: SenderRole;
  modelProviderId?: string;
  modelId?: string;
  maxAttempts?: number;
  retryDelaySeconds?: number;
  executionProfileJson?: string;
  payloadJson: string;
};

export function mapScheduleRow(row: ScheduleRow): ScheduleRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    status: row.status,
    title: row.title ?? undefined,
    dueAt: row.due_at,
    intervalSeconds: row.interval_seconds ?? undefined,
    platform: row.platform ?? undefined,
    conversationId: row.conversation_id ?? undefined,
    actorId: row.actor_id ?? undefined,
    actorRole: row.actor_role ?? undefined,
    modelProviderId: row.model_provider_id ?? undefined,
    modelId: row.model_id ?? undefined,
    maxAttempts: row.max_attempts ?? 1,
    attemptCount: row.attempt_count ?? 0,
    retryDelaySeconds: row.retry_delay_seconds ?? 300,
    payloadJson: row.payload_json,
    lastRunAt: row.last_run_at ?? undefined,
    lastError: row.last_error ?? undefined,
    lastRunId: row.last_run_id ?? undefined,
    executionProfileJson: row.execution_profile_json ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
