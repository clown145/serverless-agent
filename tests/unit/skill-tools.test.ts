import { describe, expect, it } from "vitest";
import { canUseToolWithSkill, filterToolsForSkill } from "../../src/skills/skill-tools";
import { builtinTool } from "../../src/tools/builtin/source";
import type { SelectedSkill } from "../../src/skills/skill-selector";
import type { RegisteredTool } from "../../src/tools/types";

const tools = [
  tool("vfs.read_file"),
  tool("vfs.write_file"),
  tool("messaging.send_message")
];

const selectedSkill: SelectedSkill = {
  userText: "/read /workspace/a.md",
  skill: {
    id: "reader",
    instructions: "Read files only.",
    manifest: {
      id: "reader",
      name: "Reader",
      version: "0.1.0",
      description: "Read-only skill",
      entry: "SKILL.md",
      triggers: [],
      tools: ["vfs.read_file"],
      permissions: {
        requiredLevel: 1,
        scopes: ["workspace:read"]
      }
    }
  }
};

describe("skill tool filtering", () => {
  it("only exposes manifest-declared tools", () => {
    expect(filterToolsForSkill(tools, selectedSkill).map((item) => item.definition.name)).toEqual([
      "vfs.read_file"
    ]);
  });

  it("checks tool execution against the active skill", () => {
    expect(canUseToolWithSkill("vfs.read_file", selectedSkill)).toBe(true);
    expect(canUseToolWithSkill("vfs.write_file", selectedSkill)).toBe(false);
  });

  it("requires enough permission level and scopes", () => {
    const underScoped: SelectedSkill = {
      ...selectedSkill,
      skill: {
        ...selectedSkill.skill,
        manifest: {
          ...selectedSkill.skill.manifest,
          permissions: {
            requiredLevel: 0,
            scopes: []
          }
        }
      }
    };

    expect(filterToolsForSkill(tools, underScoped)).toEqual([]);
  });
});

function tool(name: string): RegisteredTool {
  return builtinTool({
    definition: {
      name,
      description: name,
      inputSchema: { type: "object", properties: {} },
      permission: { level: 1, scopes: [] },
      sideEffect: "none",
      timeoutMs: 1000
    },
    execute: async () => ({ status: "success" })
  });
}
