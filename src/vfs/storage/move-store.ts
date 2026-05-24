import type { Env } from "../../shared/types/env";
import { nowIso } from "../../shared/time";
import { isDescendantPath, isRootPath, normalizeVfsPath, parentPath } from "../core/path";
import { vfsConflict, vfsInvalid } from "../core/errors";
import { ensureParentDirectories, findVfsEntry, getVfsEntry, listVfsTree } from "./entry-store";
import type { VfsEntry } from "./types";

export type MoveVfsEntryInput = {
  agentId: string;
  fromPath: string;
  toPath: string;
  actorId: string;
};

export async function moveVfsEntry(env: Env, input: MoveVfsEntryInput): Promise<VfsEntry> {
  const fromPath = normalizeVfsPath(input.fromPath);
  const toPath = normalizeVfsPath(input.toPath);

  if (isRootPath(fromPath) || isRootPath(toPath)) {
    throw vfsInvalid("Cannot move the VFS root directory");
  }

  if (fromPath === toPath) {
    return await getVfsEntry(env.AGENT_DB, input.agentId, fromPath);
  }

  if (isDescendantPath(toPath, fromPath)) {
    throw vfsInvalid("Cannot move a directory into itself");
  }

  const source = await getVfsEntry(env.AGENT_DB, input.agentId, fromPath);
  const target = await findVfsEntry(env.AGENT_DB, input.agentId, toPath);
  if (target) {
    throw vfsConflict(`Target already exists: ${toPath}`);
  }

  const now = nowIso();
  await ensureParentDirectories(env.AGENT_DB, {
    agentId: input.agentId,
    path: toPath,
    createdBy: input.actorId,
    now
  });

  const entries =
    source.kind === "directory"
      ? await listVfsTree(env, input.agentId, fromPath, 10_000)
      : [source];

  for (const entry of entries) {
    const suffix = entry.path.slice(fromPath.length);
    const nextPath = `${toPath}${suffix}`;
    await updateEntryPath(env.AGENT_DB, input.agentId, entry.path, nextPath, now);
    await updateContentPath(env.AGENT_DB, input.agentId, entry.path, nextPath, now);
  }

  return await getVfsEntry(env.AGENT_DB, input.agentId, toPath);
}

async function updateEntryPath(
  db: D1Database,
  agentId: string,
  oldPath: string,
  nextPath: string,
  now: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE vfs_entries
       SET path = ?, parent_path = ?, updated_at = ?
       WHERE agent_id = ? AND path = ?`
    )
    .bind(nextPath, parentPath(nextPath), now, agentId, oldPath)
    .run();
}

async function updateContentPath(
  db: D1Database,
  agentId: string,
  oldPath: string,
  nextPath: string,
  now: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE vfs_contents
       SET path = ?, updated_at = ?
       WHERE agent_id = ? AND path = ?`
    )
    .bind(nextPath, now, agentId, oldPath)
    .run();
}
