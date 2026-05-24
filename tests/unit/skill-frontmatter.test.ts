import { describe, expect, it } from "vitest";
import { createSkillMarkdown, parseSkillMarkdown } from "../../src/skills/skill-frontmatter";

describe("skill frontmatter", () => {
  it("parses standard SKILL.md frontmatter", () => {
    const parsed = parseSkillMarkdown(
      [
        "---",
        "name: skill-creator",
        "description: Create or update skills.",
        "---",
        "",
        "# Skill Creator"
      ].join("\n")
    );

    expect(parsed.frontmatter).toMatchObject({
      name: "skill-creator",
      description: "Create or update skills."
    });
    expect(parsed.body).toBe("# Skill Creator");
  });

  it("creates quoted frontmatter", () => {
    expect(
      createSkillMarkdown({
        name: "demo",
        description: "Use when a task needs: examples.",
        body: "# Demo"
      })
    ).toContain('description: "Use when a task needs: examples."');
  });
});
