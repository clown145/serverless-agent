import { createId } from "../../shared/ids";
import type { VfsStorageKind } from "./types";

export async function insertFileRevision(
  db: D1Database,
  input: {
    agentId: string;
    path: string;
    storageKind: VfsStorageKind;
    r2Key?: string;
    content?: string;
    mimeType: string;
    size: number;
    checksum: string;
    version: number;
    createdBy: string;
    now: string;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO vfs_revisions (
        id, agent_id, path, version, kind, storage_kind, r2_key, content,
        mime_type, size, checksum, created_at, created_by
      ) VALUES (?, ?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      createId("vfsrev"),
      input.agentId,
      input.path,
      input.version,
      input.storageKind,
      input.r2Key ?? null,
      input.content ?? null,
      input.mimeType,
      input.size,
      input.checksum,
      input.now,
      input.createdBy
    )
    .run();
}
