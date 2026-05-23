import { describe, expect, it } from "vitest";
import { parseExplicitSkillCommand } from "../../src/skills/skill-selector";

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

});
