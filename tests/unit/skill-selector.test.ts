import { describe, expect, it } from "vitest";
import {
  matchesSkillTrigger,
  parseExplicitSkillCommand
} from "../../src/skills/skill-selector";

describe("skill selector", () => {
  it("parses explicit skill commands", () => {
    expect(parseExplicitSkillCommand("/skill demo read this")).toEqual({
      skillId: "demo",
      userText: "read this"
    });
  });

  it("ignores regular messages", () => {
    expect(parseExplicitSkillCommand("/ping")).toBeUndefined();
  });

  it("matches command triggers", () => {
    expect(
      matchesSkillTrigger(
        {
          id: "reader",
          name: "Reader",
          version: "0.1.0",
          description: "Read files",
          entry: "SKILL.md",
          triggers: [{ type: "command", pattern: "/read" }],
          tools: ["vfs.read_file"],
          permissions: {
            requiredLevel: 1,
            scopes: ["workspace:read"]
          }
        },
        "/read /workspace/a.md"
      )
    ).toBe(true);
  });
});
