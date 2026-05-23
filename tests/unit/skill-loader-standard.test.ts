import { describe, expect, it } from "vitest";
import { listSkillCatalog, loadSkill } from "../../src/skills/skill-loader";
import type { Env } from "../../src/shared/types/env";

describe("standard skill loader", () => {
  it("loads SKILL.md frontmatter", async () => {
    const env = createSkillEnv({
      "/skills/demo/SKILL.md": [
        "---",
        "name: Demo",
        "description: Use this for demos.",
        "---",
        "",
        "# Demo",
        "Follow demo steps."
      ].join("\n")
    });

    const skill = await loadSkill(env, "default", "demo");

    expect(skill.metadata).toMatchObject({
      id: "demo",
      name: "Demo",
      description: "Use this for demos.",
      version: "0.1.0"
    });
    expect(skill.instructions).toContain("Follow demo steps.");
  });

  it("lists standard skills in the catalog", async () => {
    const env = createSkillEnv({
      "/skills/demo/SKILL.md": [
        "---",
        "name: Demo",
        "description: Use this for demos.",
        "---",
        "",
        "# Demo"
      ].join("\n")
    });

    await expect(listSkillCatalog(env, "default")).resolves.toEqual([
      {
        id: "demo",
        name: "Demo",
        description: "Use this for demos."
      }
    ]);
  });
});

function createSkillEnv(files: Record<string, string>): Env {
  return {
    AGENT_DB: {
      prepare: (sql: string) => ({
        bind: (...values: unknown[]) => ({
          first: async () => {
            const path = values[1] as string;
            if (sql.includes("FROM vfs_contents")) {
              return files[path]
                ? {
                    content: files[path],
                    mime_type: "text/markdown",
                    size: files[path].length,
                    version: 1
                  }
                : null;
            }
            if (!files[path]) {
              return null;
            }
            return {
              id: `entry-${path}`,
              agent_id: values[0],
              path,
              kind: "file",
              storage_kind: "d1_text",
              mime_type: "text/markdown",
              size: files[path].length,
              version: 1,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z"
            };
          },
          all: async () => {
            if (!sql.includes("parent_path")) {
              return { results: [] };
            }
            return {
              results: Object.keys(files).map((path) => ({
                id: `dir-${path}`,
                agent_id: values[0],
                path: path.split("/").slice(0, 3).join("/"),
                kind: "directory",
                storage_kind: "directory",
                version: 1,
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z"
              }))
            };
          },
          run: async () => ({ success: true, meta: { changes: 1 } })
        })
      })
    } as unknown as D1Database,
    __content: files
  } as unknown as Env;
}
