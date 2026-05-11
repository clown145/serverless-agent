import type { Platform } from "../../shared/types/internal-message";
import type { MessageKind } from "../../shared/types/internal-message";

export type DebugMessageItem = {
  id: string;
  agentId: string;
  conversationId: string;
  platform: Platform;
  platformMessageId: string;
  senderId: string;
  role: "user" | "assistant";
  kind: MessageKind;
  text?: string;
  rawRef?: string;
  receivedAt: string;
  createdAt: string;
  runId?: string;
  runStatus?: string;
  runUpdatedAt?: string;
};

type DebugMessageRow = {
  id: string;
  agent_id: string;
  conversation_id: string;
  platform: Platform;
  platform_message_id: string;
  sender_id: string;
  kind: MessageKind;
  text?: string | null;
  raw_ref?: string | null;
  received_at: string;
  created_at: string;
  run_id?: string | null;
  run_status?: string | null;
  run_updated_at?: string | null;
};

export async function listDebugMessages(
  db: D1Database,
  input: {
    agentId?: string;
    platform?: Platform;
    limit?: number;
  } = {}
): Promise<DebugMessageItem[]> {
  const clauses = ["1 = 1"];
  const values: string[] = [];
  if (input.agentId) {
    clauses.push("m.agent_id = ?");
    values.push(input.agentId);
  }
  if (input.platform) {
    clauses.push("m.platform = ?");
    values.push(input.platform);
  }

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const result = await db
    .prepare(
      `SELECT
         m.*,
         r.id AS run_id,
         r.status AS run_status,
         r.updated_at AS run_updated_at
       FROM messages m
       LEFT JOIN runs r ON r.trigger_message_id = m.id
       WHERE ${clauses.join(" AND ")}
       ORDER BY m.created_at DESC
       LIMIT ?`
    )
    .bind(...values, limit)
    .all<DebugMessageRow>();

  return (result.results ?? []).map(mapDebugMessageRow);
}

function mapDebugMessageRow(row: DebugMessageRow): DebugMessageItem {
  return {
    id: row.id,
    agentId: row.agent_id,
    conversationId: row.conversation_id,
    platform: row.platform,
    platformMessageId: row.platform_message_id,
    senderId: row.sender_id,
    role: row.sender_id.startsWith("agent:") ? "assistant" : "user",
    kind: row.kind,
    text: row.text ?? undefined,
    rawRef: row.raw_ref ?? undefined,
    receivedAt: row.received_at,
    createdAt: row.created_at,
    runId: row.run_id ?? undefined,
    runStatus: row.run_status ?? undefined,
    runUpdatedAt: row.run_updated_at ?? undefined
  };
}
