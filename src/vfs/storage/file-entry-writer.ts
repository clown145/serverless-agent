import { createId } from "../../shared/ids";
import { parentPath } from "../core/path";
import type { VfsStorageKind } from "./types";

export async function upsertFileEntry(
  db: D1Database,
  input: {
    agentId: string;
    path: string;
    storageKind: VfsStorageKind;
    r2Key?: string;
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
      `INSERT INTO vfs_entries (
        id, agent_id, path, parent_path, kind, storage_kind, r2_key,
        mime_type, size, checksum, version, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(agent_id, path) DO UPDATE SET
        kind = 'file',
        storage_kind = excluded.storage_kind,
        r2_key = excluded.r2_key,
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
      parentPath(input.path),
      input.storageKind,
      input.r2Key ?? null,
      input.mimeType,
      input.size,
      input.checksum,
      input.version,
      input.now,
      input.now,
      input.createdBy
    )
    .run();
}
