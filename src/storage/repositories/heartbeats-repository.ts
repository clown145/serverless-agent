export type HeartbeatInput = {
  agentId: string;
  source: string;
  status: string;
  lastSeenAt: string;
  errorCount?: number;
  detailsJson?: string;
};

export async function upsertHeartbeat(
  db: D1Database,
  input: HeartbeatInput
): Promise<void> {
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
