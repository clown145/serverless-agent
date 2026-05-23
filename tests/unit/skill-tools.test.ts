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
    metadata: {
      id: "reader",
      name: "Reader",
      version: "0.1.0",
      description: "Read-only skill"
    }
  }
};

describe("skill tool filtering", () => {
  it("does not restrict tools from standard skills", () => {
    expect(filterToolsForSkill(tools, selectedSkill)).toEqual(tools);
  });

  it("allows tool execution checks to fall through to normal permissions", () => {
    expect(canUseToolWithSkill("vfs.read_file", selectedSkill)).toBe(true);
    expect(canUseToolWithSkill("vfs.write_file", selectedSkill)).toBe(true);
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
