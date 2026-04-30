import { createId } from "../../shared/ids";
import { parentPath } from "../../tools/vfs/path";

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
    await insertDirectory(db, {
      agentId: input.agentId,
      path: current,
      createdBy: input.createdBy,
      now: input.now
    });
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
      `INSERT OR IGNORE INTO vfs_entries (
        id, agent_id, path, parent_path, kind,
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, 'directory', ?, ?, ?)`
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
