import { createId } from "../../shared/ids";

export type VfsContentRow = {
  content: string;
  mime_type?: string;
  size?: number;
  checksum?: string;
  version?: number;
};

export async function readTextContent(
  db: D1Database,
  agentId: string,
  path: string
): Promise<VfsContentRow | undefined> {
  const row = await db
    .prepare(
      `SELECT content, mime_type, size, checksum, version
       FROM vfs_contents WHERE agent_id = ? AND path = ?`
    )
    .bind(agentId, path)
    .first<VfsContentRow>();

  return row ?? undefined;
}

export async function upsertTextContent(
  db: D1Database,
  input: {
    agentId: string;
    path: string;
    content: string;
    mimeType: string;
    size: number;
    checksum: string;
    version: number;
    now: string;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO vfs_contents (
        id, agent_id, path, content, mime_type, size, checksum,
        version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(agent_id, path) DO UPDATE SET
        content = excluded.content,
        mime_type = excluded.mime_type,
        size = excluded.size,
        checksum = excluded.checksum,
        version = excluded.version,
        updated_at = excluded.updated_at`
    )
    .bind(
      createId("vfs"),
      input.agentId,
      input.path,
      input.content,
      input.mimeType,
      input.size,
      input.checksum,
      input.version,
      input.now,
      input.now
    )
    .run();
}

export async function deleteTextContent(
  db: D1Database,
  agentId: string,
  path: string
): Promise<void> {
  await db
    .prepare("DELETE FROM vfs_contents WHERE agent_id = ? AND path = ?")
    .bind(agentId, path)
    .run();
}
