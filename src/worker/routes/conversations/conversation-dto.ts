import { conversationSessionSuffix } from "../../../conversations/ids";
import type { ConversationSettingsRecord } from "../../../storage/repositories/conversation-settings-types";

export type ConversationDto = {
  id: string;
  agentId: string;
  conversationId: string;
  sessionId: string;
  platform: string;
  rootConversationId: string;
  title?: string;
  modelProviderId?: string;
  modelId?: string;
  historyLimit: number;
  summaryEnabled: boolean;
  summaryProviderId?: string;
  summaryModelId?: string;
  reasoningEffort: string;
  reasoningStateMode: string;
  summaryText?: string;
  summaryPreview?: string;
  summaryUpdatedAt?: string;
  compactedUntilMessageId?: string;
  createdAt: string;
  updatedAt: string;
};

export function toConversationDto(record: ConversationSettingsRecord): ConversationDto {
  return {
    id: record.id,
    agentId: record.agentId,
    conversationId: record.conversationId,
    sessionId: conversationSessionSuffix(record.conversationId),
    platform: record.platform,
    rootConversationId: record.rootConversationId,
    title: record.title,
    modelProviderId: record.modelProviderId,
    modelId: record.modelId,
    historyLimit: record.historyLimit,
    summaryEnabled: record.summaryEnabled,
    summaryProviderId: record.summaryProviderId,
    summaryModelId: record.summaryModelId,
    reasoningEffort: record.reasoningEffort,
    reasoningStateMode: record.reasoningStateMode,
    summaryText: record.summaryText,
    summaryPreview: preview(record.summaryText),
    summaryUpdatedAt: record.summaryUpdatedAt,
    compactedUntilMessageId: record.compactedUntilMessageId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function preview(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length > 160 ? `${value.slice(0, 160)}...` : value;
}
