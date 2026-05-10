import type { Platform } from "../../shared/types/internal-message";

export type ConversationSettingsRecord = {
  id: string;
  agentId: string;
  conversationId: string;
  platform: Platform;
  rootConversationId: string;
  title?: string;
  modelProviderId?: string;
  modelId?: string;
  historyLimit: number;
  summaryEnabled: boolean;
  summaryProviderId?: string;
  summaryModelId?: string;
  summaryText?: string;
  summaryUpdatedAt?: string;
  compactedUntilMessageId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationSettingsRow = {
  id: string;
  agent_id: string;
  conversation_id: string;
  platform: Platform;
  root_conversation_id: string;
  title?: string | null;
  model_provider_id?: string | null;
  model_id?: string | null;
  history_limit?: number | null;
  summary_enabled?: number | null;
  summary_provider_id?: string | null;
  summary_model_id?: string | null;
  summary_text?: string | null;
  summary_updated_at?: string | null;
  compacted_until_message_id?: string | null;
  created_at: string;
  updated_at: string;
};

export function mapConversationSettingsRow(
  row: ConversationSettingsRow
): ConversationSettingsRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    conversationId: row.conversation_id,
    platform: row.platform,
    rootConversationId: row.root_conversation_id,
    title: row.title ?? undefined,
    modelProviderId: row.model_provider_id ?? undefined,
    modelId: row.model_id ?? undefined,
    historyLimit: clampHistoryLimit(row.history_limit ?? 16),
    summaryEnabled: row.summary_enabled !== 0,
    summaryProviderId: row.summary_provider_id ?? undefined,
    summaryModelId: row.summary_model_id ?? undefined,
    summaryText: row.summary_text ?? undefined,
    summaryUpdatedAt: row.summary_updated_at ?? undefined,
    compactedUntilMessageId: row.compacted_until_message_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function clampHistoryLimit(value: number): number {
  return Math.min(Math.max(Math.trunc(value), 4), 80);
}
