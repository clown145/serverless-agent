import { createVfsDirectory } from "../storage";
import type { Env } from "../../shared/types/env";

export const DEFAULT_VFS_DIRECTORIES = [
  "/system",
  "/system/skills",
  "/system/prompts",
  "/system/tool-specs",
  "/user",
  "/user/skills",
  "/user/memory",
  "/user/preferences",
  "/workspace",
  "/workspace/tasks",
  "/workspace/artifacts",
  "/workspace/scratch",
  "/workspace/inbox",
  "/workspace/notes",
  "/skills",
  "/artifacts",
  "/inbox",
  "/outbox"
] as const;

export type VfsWorkspaceBootstrapStatus = {
  initialized: boolean;
  expected: number;
  existing: number;
  missingPaths: string[];
};

export async function initializeVfsWorkspace(
  env: Env,
  input: { agentId: string; actorId: string }
): Promise<VfsWorkspaceBootstrapStatus> {
  for (const path of DEFAULT_VFS_DIRECTORIES) {
    await createVfsDirectory(env, {
      agentId: input.agentId,
      path,
      createdBy: input.actorId
    });
  }

  return await getVfsWorkspaceBootstrapStatus(env, input.agentId);
}

export async function getVfsWorkspaceBootstrapStatus(
  env: Env,
  agentId: string
): Promise<VfsWorkspaceBootstrapStatus> {
  const placeholders = DEFAULT_VFS_DIRECTORIES.map(() => "?").join(", ");
  const result = await env.AGENT_DB.prepare(
    `SELECT path FROM vfs_entries
     WHERE agent_id = ?
       AND kind = 'directory'
       AND path IN (${placeholders})`
  )
    .bind(agentId, ...DEFAULT_VFS_DIRECTORIES)
    .all<{ path: string }>();

  const existingPaths = new Set((result.results ?? []).map((row) => row.path));
  const missingPaths = DEFAULT_VFS_DIRECTORIES.filter((path) => !existingPaths.has(path));

  return {
    initialized: missingPaths.length === 0,
    expected: DEFAULT_VFS_DIRECTORIES.length,
    existing: existingPaths.size,
    missingPaths
  };
}
