export type HeartbeatInput = {
  agentId: string;
  source: string;
  status: string;
  lastSeenAt: string;
  errorCount?: number;
  detailsJson?: string;
};

export type HeartbeatRecord = {
  id: string;
  agentId: string;
  source: string;
  status: string;
  lastSeenAt: string;
  errorCount: number;
  detailsJson?: string;
};

type HeartbeatRow = {
  id: string;
  agent_id: string;
  source: string;
  status: string;
  last_seen_at: string;
  error_count: number;
  details_json?: string;
};

export async function upsertHeartbeat(db: D1Database, input: HeartbeatInput): Promise<void> {
  const id = `${input.agentId}:${input.source}`;

  await db
    .prepare(
      `INSERT INTO heartbeats (
        id, agent_id, source, status, last_seen_at, error_count, details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        last_seen_at = excluded.last_seen_at,
        error_count = excluded.error_count,
        details_json = excluded.details_json`
    )
    .bind(
      id,
      input.agentId,
      input.source,
      input.status,
      input.lastSeenAt,
      input.errorCount ?? 0,
      input.detailsJson ?? null
    )
    .run();
}

export async function listHeartbeats(db: D1Database, agentId?: string): Promise<HeartbeatRecord[]> {
  const query = agentId
    ? db.prepare("SELECT * FROM heartbeats WHERE agent_id = ? ORDER BY source ASC").bind(agentId)
    : db.prepare("SELECT * FROM heartbeats ORDER BY agent_id ASC, source ASC");
  const result = await query.all<HeartbeatRow>();

  return (result.results ?? []).map((row) => ({
    id: row.id,
    agentId: row.agent_id,
    source: row.source,
    status: row.status,
    lastSeenAt: row.last_seen_at,
    errorCount: row.error_count,
    detailsJson: row.details_json ?? undefined
  }));
}
