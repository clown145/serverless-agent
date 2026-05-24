import { describe, expect, it } from "vitest";
import type { Env } from "../../src/shared/types/env";
import {
  listSkillFileRevisions,
  readSkillFileRevision,
  rollbackSkillFile,
  updateSkillFile
} from "../../src/skills/skill-service";

describe("skill service file revisions", () => {
  it("lists, reads and rolls back skill file revisions", async () => {
    const env = createSkillServiceEnv();
    const agentId = "default";
    const skillId = "demo";

    await updateSkillFile(env, {
      agentId,
      skillId,
      relativePath: "SKILL.md",
      content: skillMarkdown("First"),
      createdBy: "test"
    });
    await updateSkillFile(env, {
      agentId,
      skillId,
      relativePath: "SKILL.md",
      content: skillMarkdown("Second"),
      createdBy: "test"
    });

    await expect(
      listSkillFileRevisions(env, { agentId, skillId, relativePath: "SKILL.md" })
    ).resolves.toMatchObject([
      { version: 2, createdBy: "test" },
      { version: 1, createdBy: "test" }
    ]);

    const revision = await readSkillFileRevision(env, {
      agentId,
      skillId,
      relativePath: "SKILL.md",
      version: 1
    });
    expect(revision.content).toContain("First");

    await rollbackSkillFile(env, {
      agentId,
      skillId,
      relativePath: "SKILL.md",
      version: 1,
      createdBy: "admin"
    });

    await expect(
      readSkillFileRevision(env, {
        agentId,
        skillId,
        relativePath: "SKILL.md",
        version: 3
      })
    ).resolves.toMatchObject({
      content: expect.stringContaining("First"),
      createdBy: "admin"
    });
  });

  it("allows reference files named SKILL.md without root frontmatter", async () => {
    const env = createSkillServiceEnv();

    await updateSkillFile(env, {
      agentId: "default",
      skillId: "demo",
      relativePath: "SKILL.md",
      content: skillMarkdown("Root"),
      createdBy: "test"
    });

    await expect(
      updateSkillFile(env, {
        agentId: "default",
        skillId: "demo",
        relativePath: "references/SKILL.md",
        content: "# Reference\n",
        createdBy: "test"
      })
    ).resolves.toMatchObject({
      id: "demo"
    });
  });
});

function skillMarkdown(label: string): string {
  return ["---", "name: Demo", "description: Use this for demos.", "---", "", `# ${label}`].join(
    "\n"
  );
}

type VfsEntryRow = {
  id: string;
  agent_id: string;
  path: string;
  parent_path: string;
  kind: "file" | "directory";
  storage_kind: string;
  r2_key?: string | null;
  content?: string | null;
  mime_type?: string | null;
  size?: number | null;
  checksum?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
};

function createSkillServiceEnv(): Env {
  const entries = new Map<string, VfsEntryRow>();
  const contents = new Map<string, VfsEntryRow>();
  const revisions: VfsEntryRow[] = [];

  const db = {
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => ({
        first: async () => first(sql, values, entries, contents, revisions),
        all: async () => ({
          results: all(sql, values, entries, revisions)
        }),
        run: async () => {
          run(sql, values, entries, contents, revisions);
          return { success: true, meta: { changes: 1 } };
        }
      })
    })
  };

  return {
    AGENT_DB: db as unknown as D1Database
  } as Env;
}

function key(agentId: unknown, path: unknown): string {
  return `${agentId}:${path}`;
}

function first(
  sql: string,
  values: unknown[],
  entries: Map<string, VfsEntryRow>,
  contents: Map<string, VfsEntryRow>,
  revisions: VfsEntryRow[]
): VfsEntryRow | null {
  if (sql.includes("FROM vfs_contents")) {
    return contents.get(key(values[0], values[1])) ?? null;
  }
  if (sql.includes("FROM vfs_revisions")) {
    return (
      revisions.find(
        (row) => row.agent_id === values[0] && row.path === values[1] && row.version === values[2]
      ) ?? null
    );
  }
  if (sql.includes("FROM vfs_entries")) {
    return entries.get(key(values[0], values[1])) ?? null;
  }
  return null;
}

function all(
  sql: string,
  values: unknown[],
  entries: Map<string, VfsEntryRow>,
  revisions: VfsEntryRow[]
): VfsEntryRow[] {
  if (sql.includes("FROM vfs_revisions")) {
    return revisions
      .filter((row) => row.agent_id === values[0] && row.path === values[1])
      .sort((left, right) => right.version - left.version)
      .slice(0, values[2] as number);
  }

  if (sql.includes("parent_path")) {
    return Array.from(entries.values()).filter(
      (row) => row.agent_id === values[0] && row.parent_path === values[1]
    );
  }

  return Array.from(entries.values()).filter((row) => row.agent_id === values[0]);
}

function run(
  sql: string,
  values: unknown[],
  entries: Map<string, VfsEntryRow>,
  contents: Map<string, VfsEntryRow>,
  revisions: VfsEntryRow[]
): void {
  if (sql.includes("INSERT INTO vfs_entries") && sql.includes("'directory'")) {
    const row = directoryRow(values);
    entries.set(key(row.agent_id, row.path), row);
    return;
  }

  if (sql.includes("INSERT INTO vfs_entries") && sql.includes("'file'")) {
    const existing = entries.get(key(values[1], values[2]));
    const row = fileEntryRow(values, existing);
    entries.set(key(row.agent_id, row.path), row);
    return;
  }

  if (sql.includes("INSERT INTO vfs_contents")) {
    const row = contentRow(values);
    contents.set(key(row.agent_id, row.path), row);
    return;
  }

  if (sql.includes("INSERT INTO vfs_revisions")) {
    revisions.push(revisionRow(values));
  }
}

function directoryRow(values: unknown[]): VfsEntryRow {
  return {
    id: values[0] as string,
    agent_id: values[1] as string,
    path: values[2] as string,
    parent_path: values[3] as string,
    kind: "directory",
    storage_kind: "directory",
    version: 1,
    created_at: values[4] as string,
    updated_at: values[5] as string,
    created_by: values[6] as string
  };
}

function fileEntryRow(values: unknown[], existing?: VfsEntryRow): VfsEntryRow {
  return {
    id: existing?.id ?? (values[0] as string),
    agent_id: values[1] as string,
    path: values[2] as string,
    parent_path: values[3] as string,
    kind: "file",
    storage_kind: values[4] as string,
    r2_key: values[5] as string | null,
    mime_type: values[6] as string,
    size: values[7] as number,
    checksum: values[8] as string,
    version: values[9] as number,
    created_at: existing?.created_at ?? (values[10] as string),
    updated_at: values[11] as string,
    created_by: values[12] as string
  };
}

function contentRow(values: unknown[]): VfsEntryRow {
  return {
    id: values[0] as string,
    agent_id: values[1] as string,
    path: values[2] as string,
    content: values[3] as string,
    kind: "file",
    storage_kind: "d1_text",
    parent_path: "",
    version: values[7] as number,
    mime_type: values[4] as string,
    size: values[5] as number,
    checksum: values[6] as string,
    created_at: values[8] as string,
    updated_at: values[9] as string
  };
}

function revisionRow(values: unknown[]): VfsEntryRow {
  return {
    id: values[0] as string,
    agent_id: values[1] as string,
    path: values[2] as string,
    version: values[3] as number,
    kind: "file",
    storage_kind: values[4] as string,
    r2_key: values[5] as string | null,
    content: values[6] as string | null,
    mime_type: values[7] as string,
    size: values[8] as number,
    checksum: values[9] as string,
    created_at: values[10] as string,
    updated_at: values[10] as string,
    created_by: values[11] as string,
    parent_path: ""
  };
}
