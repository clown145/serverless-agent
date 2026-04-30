import type { Env } from "../../shared/types/env";
import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import { buildVfsObjectKey } from "../r2-keys";
import { normalizeVfsPath, parentPath } from "../../tools/vfs/path";

export type VfsEntry = {
  id: string;
  agentId: string;
  path: string;
  kind: "file" | "directory";
  r2Key?: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
  updatedAt: string;
};

export type PutVfsFileInput = {
  agentId: string;
  path: string;
  content: string;
  mimeType?: string;
  createdBy: string;
};

export async function putVfsFile(
  env: Env,
  input: PutVfsFileInput
): Promise<VfsEntry> {
  const path = normalizeVfsPath(input.path);
  const r2Key = buildVfsObjectKey(input.agentId, path);
  const now = nowIso();
  const size = new TextEncoder().encode(input.content).byteLength;

  await env.AGENT_BUCKET.put(r2Key, input.content, {
    httpMetadata: { contentType: input.mimeType ?? "text/plain; charset=utf-8" }
  });

  await env.AGENT_DB.prepare(
    `INSERT INTO vfs_entries (
      id, agent_id, path, parent_path, kind, r2_key, mime_type,
      size, created_at, updated_at, created_by
    ) VALUES (?, ?, ?, ?, 'file', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_id, path) DO UPDATE SET
      r2_key = excluded.r2_key,
      mime_type = excluded.mime_type,
      size = excluded.size,
      updated_at = excluded.updated_at`
  )
    .bind(
      createId("vfs"),
      input.agentId,
      path,
      parentPath(path),
      r2Key,
      input.mimeType ?? "text/plain; charset=utf-8",
      size,
      now,
      now,
      input.createdBy
    )
    .run();

  return {
    id: `${input.agentId}:${path}`,
    agentId: input.agentId,
    path,
    kind: "file",
    r2Key,
    mimeType: input.mimeType,
    size,
    createdAt: now,
    updatedAt: now
  };
}

export async function getVfsFile(
  env: Env,
  agentId: string,
  path: string
): Promise<{ path: string; content: string; mimeType?: string }> {
  const normalized = normalizeVfsPath(path);
  const entry = await env.AGENT_DB.prepare(
    "SELECT r2_key, mime_type FROM vfs_entries WHERE agent_id = ? AND path = ?"
  )
    .bind(agentId, normalized)
    .first<{ r2_key: string; mime_type?: string }>();

  if (!entry?.r2_key) {
    throw new Error(`VFS file not found: ${normalized}`);
  }

  const object = await env.AGENT_BUCKET.get(entry.r2_key);
  if (!object) {
    throw new Error(`VFS object not found: ${normalized}`);
  }

  return {
    path: normalized,
    content: await object.text(),
    mimeType: entry.mime_type
  };
}

export async function listVfsEntries(
  env: Env,
  agentId: string,
  path: string
): Promise<VfsEntry[]> {
  const normalized = normalizeVfsPath(path);
  const result = await env.AGENT_DB.prepare(
    `SELECT id, agent_id, path, kind, r2_key, mime_type, size, created_at, updated_at
     FROM vfs_entries WHERE agent_id = ? AND parent_path = ?
     ORDER BY path ASC`
  )
    .bind(agentId, normalized)
    .all<VfsEntry>();

  return result.results ?? [];
}
