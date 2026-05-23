import { createId } from "../../shared/ids";
import type { Env } from "../../shared/types/env";
import { createBlobStorage } from "../../storage/blob";
import type { VfsStorageKind } from "./types";

export type VfsRevision = {
  id: string;
  agentId: string;
  path: string;
  version: number;
  kind: "file";
  storageKind: VfsStorageKind;
  r2Key?: string;
  content?: string;
  mimeType?: string;
  size?: number;
  checksum?: string;
  createdAt: string;
  createdBy: string;
};

type VfsRevisionRow = {
  id: string;
  agent_id: string;
  path: string;
  version: number;
  kind: "file";
  storage_kind: VfsStorageKind;
  r2_key?: string | null;
  content?: string | null;
  mime_type?: string | null;
  size?: number | null;
  checksum?: string | null;
  created_at: string;
  created_by: string;
};

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

export async function listFileRevisions(
  db: D1Database,
  input: {
    agentId: string;
    path: string;
    limit?: number;
  }
): Promise<VfsRevision[]> {
  const result = await db
    .prepare(
      `SELECT id, agent_id, path, version, kind, storage_kind, r2_key, content,
        mime_type, size, checksum, created_at, created_by
       FROM vfs_revisions
       WHERE agent_id = ? AND path = ? AND kind = 'file'
       ORDER BY version DESC
       LIMIT ?`
    )
    .bind(input.agentId, input.path, input.limit ?? 50)
    .all<VfsRevisionRow>();

  return (result.results ?? []).map(mapRevisionRow);
}

export async function getFileRevision(
  db: D1Database,
  input: {
    agentId: string;
    path: string;
    version: number;
  }
): Promise<VfsRevision | undefined> {
  const row = await db
    .prepare(
      `SELECT id, agent_id, path, version, kind, storage_kind, r2_key, content,
        mime_type, size, checksum, created_at, created_by
       FROM vfs_revisions
       WHERE agent_id = ? AND path = ? AND version = ? AND kind = 'file'
       LIMIT 1`
    )
    .bind(input.agentId, input.path, input.version)
    .first<VfsRevisionRow>();

  return row ? mapRevisionRow(row) : undefined;
}

export async function readFileRevisionContent(
  env: Env,
  input: {
    agentId: string;
    path: string;
    version: number;
  }
): Promise<VfsRevision & { content: string }> {
  const revision = await getFileRevision(env.AGENT_DB, input);
  if (!revision) {
    throw new Error(`VFS revision not found: ${input.path} v${input.version}`);
  }

  if (revision.content !== undefined) {
    return { ...revision, content: revision.content };
  }

  if (!revision.r2Key) {
    throw new Error(`VFS revision content is missing: ${input.path} v${input.version}`);
  }

  const object = await createBlobStorage(env).get(revision.r2Key);
  if (!object) {
    throw new Error(`VFS revision object not found: ${input.path} v${input.version}`);
  }

  return { ...revision, content: await object.text() };
}

function mapRevisionRow(row: VfsRevisionRow): VfsRevision {
  return {
    id: row.id,
    agentId: row.agent_id,
    path: row.path,
    version: row.version,
    kind: row.kind,
    storageKind: row.storage_kind,
    r2Key: row.r2_key ?? undefined,
    content: row.content ?? undefined,
    mimeType: row.mime_type ?? undefined,
    size: row.size ?? undefined,
    checksum: row.checksum ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by
  };
}
