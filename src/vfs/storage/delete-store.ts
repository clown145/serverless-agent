import type { Env } from "../../shared/types/env";
import { isRootPath, normalizeVfsPath } from "../core/path";
import { vfsConflict, vfsInvalid } from "../core/errors";
import { deleteTextContent } from "./content-store";
import { getVfsEntry, listVfsTree } from "./entry-store";
import { mapVfsEntry, type VfsEntry, type VfsEntryRow } from "./types";
import { VFS_ENTRY_COLUMNS } from "./sql";

export type DeleteVfsEntryInput = {
  agentId: string;
  path: string;
  recursive?: boolean;
};

export async function deleteVfsEntry(
  env: Env,
  input: DeleteVfsEntryInput
): Promise<{ deleted: number }> {
  const path = normalizeVfsPath(input.path);
  if (isRootPath(path)) {
    throw vfsInvalid("Cannot delete the VFS root directory");
  }

  const entry = await getVfsEntry(env.AGENT_DB, input.agentId, path);
  const children = entry.kind === "directory"
    ? await listDirectChildren(env.AGENT_DB, input.agentId, path)
    : [];

  if (children.length > 0 && !input.recursive) {
    throw vfsConflict(`Directory is not empty: ${path}`);
  }

  const deletedPaths =
    entry.kind === "directory"
      ? (await listVfsTree(env, input.agentId, path, 10_000)).map((item) => item.path)
      : [path];

  for (const deletedPath of deletedPaths) {
    await deleteTextContent(env.AGENT_DB, input.agentId, deletedPath);
    await env.AGENT_DB.prepare(
      "DELETE FROM vfs_entries WHERE agent_id = ? AND path = ?"
    )
      .bind(input.agentId, deletedPath)
      .run();
  }

  return { deleted: deletedPaths.length };
}

async function listDirectChildren(
  db: D1Database,
  agentId: string,
  path: string
): Promise<VfsEntry[]> {
  const result = await db
    .prepare(
      `SELECT ${VFS_ENTRY_COLUMNS}
       FROM vfs_entries
       WHERE agent_id = ? AND parent_path = ?
       LIMIT 1`
    )
    .bind(agentId, path)
    .all<VfsEntryRow>();

  return (result.results ?? []).map(mapVfsEntry);
}
