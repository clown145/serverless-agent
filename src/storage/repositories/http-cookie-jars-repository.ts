export type HttpCookieJarRecord = {
  agentId: string;
  jarId: string;
  encryptedValue: string;
  iv: string;
  algorithm: string;
  createdAt: string;
  updatedAt: string;
};

type HttpCookieJarRow = {
  agent_id: string;
  jar_id: string;
  encrypted_value: string;
  iv: string;
  algorithm: string;
  created_at: string;
  updated_at: string;
};

export async function getHttpCookieJarRecord(
  db: D1Database,
  input: { agentId: string; jarId: string }
): Promise<HttpCookieJarRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM http_cookie_jars WHERE agent_id = ? AND jar_id = ?")
    .bind(input.agentId, input.jarId)
    .first<HttpCookieJarRow>();

  return row ? mapHttpCookieJarRow(row) : undefined;
}

export async function upsertHttpCookieJarRecord(
  db: D1Database,
  input: HttpCookieJarRecord
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO http_cookie_jars (
        agent_id, jar_id, encrypted_value, iv, algorithm, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(agent_id, jar_id) DO UPDATE SET
        encrypted_value = excluded.encrypted_value,
        iv = excluded.iv,
        algorithm = excluded.algorithm,
        updated_at = excluded.updated_at`
    )
    .bind(
      input.agentId,
      input.jarId,
      input.encryptedValue,
      input.iv,
      input.algorithm,
      input.createdAt,
      input.updatedAt
    )
    .run();
}

export async function deleteHttpCookieJarRecord(
  db: D1Database,
  input: { agentId: string; jarId: string }
): Promise<void> {
  await db
    .prepare("DELETE FROM http_cookie_jars WHERE agent_id = ? AND jar_id = ?")
    .bind(input.agentId, input.jarId)
    .run();
}

function mapHttpCookieJarRow(row: HttpCookieJarRow): HttpCookieJarRecord {
  return {
    agentId: row.agent_id,
    jarId: row.jar_id,
    encryptedValue: row.encrypted_value,
    iv: row.iv,
    algorithm: row.algorithm,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
