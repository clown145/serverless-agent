import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { Platform } from "../../shared/types/internal-message";
import {
  clampHistoryLimit,
  mapConversationSettingsRow,
  type ConversationSettingsRecord,
  type ConversationSettingsRow
} from "./conversation-settings-types";

export type EnsureConversationSettingsInput = {
  agentId: string;
  conversationId: string;
  platform: Platform;
  rootConversationId: string;
  title?: string;
};

export type UpdateConversationSettingsInput = {
  title?: string | null;
  modelProviderId?: string | null;
  modelId?: string | null;
  historyLimit?: number;
  summaryEnabled?: boolean;
  summaryProviderId?: string | null;
  summaryModelId?: string | null;
};

export async function ensureConversationSettings(
  db: D1Database,
  input: EnsureConversationSettingsInput
): Promise<ConversationSettingsRecord> {
  const existing = await getConversationSettings(db, input.agentId, input.conversationId);
  if (existing) {
    return existing;
  }

  const id = createId("conv");
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO conversation_settings (
        id, agent_id, conversation_id, platform, root_conversation_id,
        title, history_limit, summary_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 16, 1, ?, ?)
      ON CONFLICT(agent_id, conversation_id) DO NOTHING`
    )
    .bind(
      id,
      input.agentId,
      input.conversationId,
      input.platform,
      input.rootConversationId,
      input.title ?? null,
      now,
      now
    )
    .run();

  const ensured = await getConversationSettings(db, input.agentId, input.conversationId);
  if (!ensured) {
    throw new Error("Failed to ensure conversation settings");
  }

  return ensured;
}

export async function getConversationSettings(
  db: D1Database,
  agentId: string,
  conversationId: string
): Promise<ConversationSettingsRecord | undefined> {
  const row = await db
    .prepare(
      `SELECT * FROM conversation_settings
       WHERE agent_id = ? AND conversation_id = ?`
    )
    .bind(agentId, conversationId)
    .first<ConversationSettingsRow>();

  return row ? mapConversationSettingsRow(row) : undefined;
}

export async function listConversationSettingsByRoot(
  db: D1Database,
  input: {
    agentId: string;
    platform: Platform;
    rootConversationId: string;
  }
): Promise<ConversationSettingsRecord[]> {
  const result = await db
    .prepare(
      `SELECT * FROM conversation_settings
       WHERE agent_id = ? AND platform = ? AND root_conversation_id = ?
       ORDER BY updated_at DESC`
    )
    .bind(input.agentId, input.platform, input.rootConversationId)
    .all<ConversationSettingsRow>();

  return (result.results ?? []).map(mapConversationSettingsRow);
}

export async function listConversationSettings(
  db: D1Database,
  input: {
    agentId?: string;
    platform?: Platform;
    rootConversationId?: string;
    limit?: number;
  } = {}
): Promise<ConversationSettingsRecord[]> {
  const clauses = ["1 = 1"];
  const values: string[] = [];
  if (input.agentId) {
    clauses.push("agent_id = ?");
    values.push(input.agentId);
  }
  if (input.platform) {
    clauses.push("platform = ?");
    values.push(input.platform);
  }
  if (input.rootConversationId) {
    clauses.push("root_conversation_id = ?");
    values.push(input.rootConversationId);
  }

  const limit = Math.min(Math.max(input.limit ?? 80, 1), 200);
  const result = await db
    .prepare(
      `SELECT * FROM conversation_settings
       WHERE ${clauses.join(" AND ")}
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .bind(...values, limit)
    .all<ConversationSettingsRow>();

  return (result.results ?? []).map(mapConversationSettingsRow);
}

export async function updateConversationSettings(
  db: D1Database,
  agentId: string,
  conversationId: string,
  input: UpdateConversationSettingsInput
): Promise<ConversationSettingsRecord | undefined> {
  const existing = await getConversationSettings(db, agentId, conversationId);
  if (!existing) {
    return undefined;
  }

  const next = {
    title: valueOrExisting(input.title, existing.title),
    modelProviderId: valueOrExisting(input.modelProviderId, existing.modelProviderId),
    modelId: valueOrExisting(input.modelId, existing.modelId),
    historyLimit:
      input.historyLimit !== undefined
        ? clampHistoryLimit(input.historyLimit)
        : existing.historyLimit,
    summaryEnabled: input.summaryEnabled ?? existing.summaryEnabled,
    summaryProviderId: valueOrExisting(input.summaryProviderId, existing.summaryProviderId),
    summaryModelId: valueOrExisting(input.summaryModelId, existing.summaryModelId)
  };
  const now = nowIso();

  await db
    .prepare(
      `UPDATE conversation_settings
       SET title = ?,
           model_provider_id = ?,
           model_id = ?,
           history_limit = ?,
           summary_enabled = ?,
           summary_provider_id = ?,
           summary_model_id = ?,
           updated_at = ?
       WHERE agent_id = ? AND conversation_id = ?`
    )
    .bind(
      next.title ?? null,
      next.modelProviderId ?? null,
      next.modelId ?? null,
      next.historyLimit,
      next.summaryEnabled ? 1 : 0,
      next.summaryProviderId ?? null,
      next.summaryModelId ?? null,
      now,
      agentId,
      conversationId
    )
    .run();

  return getConversationSettings(db, agentId, conversationId);
}

export async function updateConversationSummary(
  db: D1Database,
  input: {
    agentId: string;
    conversationId: string;
    summaryText: string;
    compactedUntilMessageId: string;
  }
): Promise<void> {
  const now = nowIso();
  await db
    .prepare(
      `UPDATE conversation_settings
       SET summary_text = ?,
           summary_updated_at = ?,
           compacted_until_message_id = ?,
           updated_at = ?
       WHERE agent_id = ? AND conversation_id = ?`
    )
    .bind(
      input.summaryText,
      now,
      input.compactedUntilMessageId,
      now,
      input.agentId,
      input.conversationId
    )
    .run();
}

function valueOrExisting<T>(value: T | null | undefined, existing: T | undefined): T | undefined {
  if (value === undefined) {
    return existing;
  }

  return value === null ? undefined : value;
}
