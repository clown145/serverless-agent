export type RunListItem = {
  id: string;
  agentId: string;
  conversationId?: string;
  triggerMessageId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type RunRow = {
  id: string;
  agent_id: string;
  conversation_id?: string;
  trigger_message_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function listRuns(
  db: D1Database,
  input: {
    agentId?: string;
    limit?: number;
  } = {}
): Promise<RunListItem[]> {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const query = input.agentId
    ? db
        .prepare("SELECT * FROM runs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?")
        .bind(input.agentId, limit)
    : db.prepare("SELECT * FROM runs ORDER BY created_at DESC LIMIT ?").bind(limit);
  const result = await query.all<RunRow>();

  return (result.results ?? []).map(mapRunRow);
}

function mapRunRow(row: RunRow): RunListItem {
  return {
    id: row.id,
    agentId: row.agent_id,
    conversationId: row.conversation_id ?? undefined,
    triggerMessageId: row.trigger_message_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
