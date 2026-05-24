import type { Env } from "../../shared/types/env";
import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import { isRootPath, normalizeVfsPath, parentPath } from "../core/path";
import { vfsConflict, vfsInvalid, vfsNotFound } from "../core/errors";
import { mapVfsEntry, type VfsEntry, type VfsEntryRow } from "./types";
import { escapeSqlLike, VFS_ENTRY_COLUMNS } from "./sql";

export type CreateVfsDirectoryInput = {
  agentId: string;
  path: string;
  createdBy: string;
};

export async function findVfsEntry(
  db: D1Database,
  agentId: string,
  path: string
): Promise<VfsEntry | undefined> {
  const normalized = normalizeVfsPath(path);
  const row = await db
    .prepare(
      `SELECT ${VFS_ENTRY_COLUMNS}
       FROM vfs_entries WHERE agent_id = ? AND path = ?`
    )
    .bind(agentId, normalized)
    .first<VfsEntryRow>();

  return row ? mapVfsEntry(row) : undefined;
}

export async function getVfsEntry(
  db: D1Database,
  agentId: string,
  path: string
): Promise<VfsEntry> {
  const normalized = normalizeVfsPath(path);
  const entry = await findVfsEntry(db, agentId, normalized);
  if (!entry) {
    throw vfsNotFound(normalized);
  }

  return entry;
}

export async function listVfsEntries(env: Env, agentId: string, path: string): Promise<VfsEntry[]> {
  const normalized = normalizeVfsPath(path);
  const result = await env.AGENT_DB.prepare(
    `SELECT ${VFS_ENTRY_COLUMNS}
     FROM vfs_entries WHERE agent_id = ? AND parent_path = ?
     ORDER BY kind ASC, path ASC`
  )
    .bind(agentId, normalized)
    .all<VfsEntryRow>();

  return (result.results ?? []).map(mapVfsEntry);
}

export async function listVfsTree(
  env: Env,
  agentId: string,
  path: string,
  limit = 200
): Promise<VfsEntry[]> {
  const normalized = normalizeVfsPath(path);
  const result = await env.AGENT_DB.prepare(
    `SELECT ${VFS_ENTRY_COLUMNS}
     FROM vfs_entries
     WHERE agent_id = ?
       AND (? = '/' OR path = ? OR path LIKE ? ESCAPE '\\')
     ORDER BY path ASC
     LIMIT ?`
  )
    .bind(agentId, normalized, normalized, `${escapeSqlLike(normalized)}/%`, limit)
    .all<VfsEntryRow>();

  return (result.results ?? []).map(mapVfsEntry);
}

export async function createVfsDirectory(
  env: Env,
  input: CreateVfsDirectoryInput
): Promise<VfsEntry> {
  const path = normalizeVfsPath(input.path);
  if (isRootPath(path)) {
    throw vfsInvalid("Cannot create the VFS root directory");
  }

  const now = nowIso();
  await ensureParentDirectories(env.AGENT_DB, {
    agentId: input.agentId,
    path,
    createdBy: input.createdBy,
    now
  });

  const existing = await findVfsEntry(env.AGENT_DB, input.agentId, path);
  if (existing?.kind === "file") {
    throw vfsConflict(`A file already exists at ${path}`);
  }

  if (!existing) {
    await insertDirectory(env.AGENT_DB, {
      agentId: input.agentId,
      path,
      createdBy: input.createdBy,
      now
    });
  }

  return await getVfsEntry(env.AGENT_DB, input.agentId, path);
}

export async function ensureParentDirectories(
  db: D1Database,
  input: {
    agentId: string;
    path: string;
    createdBy: string;
    now: string;
  }
): Promise<void> {
  const parts = input.path.split("/").filter(Boolean);
  const directories = parts.slice(0, -1);
  let current = "";

  for (const directory of directories) {
    current = `${current}/${directory}`;
    const existing = await findVfsEntry(db, input.agentId, current);
    if (existing?.kind === "file") {
      throw vfsConflict(`Parent path is a file: ${current}`);
    }

    if (!existing) {
      await insertDirectory(db, {
        agentId: input.agentId,
        path: current,
        createdBy: input.createdBy,
        now: input.now
      });
    }
  }
}

async function insertDirectory(
  db: D1Database,
  input: {
    agentId: string;
    path: string;
    createdBy: string;
    now: string;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO vfs_entries (
        id, agent_id, path, parent_path, kind, storage_kind,
        version, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, 'directory', 'directory', 1, ?, ?, ?)`
    )
    .bind(
      createId("vfs"),
      input.agentId,
      input.path,
      parentPath(input.path),
      input.now,
      input.now,
      input.createdBy
    )
    .run();
}
