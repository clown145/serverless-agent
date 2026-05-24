import { describe, expect, it } from "vitest";
import {
  canUseToolWithSkill,
  filterToolsForSkill,
  validateSkillToolCall
} from "../../src/skills/skill-tools";
import { builtinTool } from "../../src/tools/builtin/source";
import type { SelectedSkill } from "../../src/skills/skill-selector";
import type { RegisteredTool } from "../../src/tools/types";

const tools = [
  tool("vfs.read_file"),
  tool("vfs.write_file"),
  tool("vfs.command"),
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
  it("limits VFS tools exposed to active skills", () => {
    expect(filterToolsForSkill(tools, selectedSkill).map((item) => item.definition.name)).toEqual([
      "vfs.read_file",
      "messaging.send_message"
    ]);
  });

  it("allows non-VFS tools to fall through to normal permissions", () => {
    expect(canUseToolWithSkill("vfs.read_file", selectedSkill)).toBe(true);
    expect(canUseToolWithSkill("vfs.write_file", selectedSkill)).toBe(false);
    expect(canUseToolWithSkill("vfs.command", selectedSkill)).toBe(false);
    expect(canUseToolWithSkill("messaging.send_message", selectedSkill)).toBe(true);
  });

  it("allows skill-scoped VFS paths", () => {
    expect(
      validateSkillToolCall(
        "vfs.read_file",
        { path: "/skills/reader/references/example.md" },
        selectedSkill
      )
    ).toBeUndefined();
  });

  it("rejects VFS reads outside the selected skill directory", () => {
    expect(
      validateSkillToolCall("vfs.read_file", { path: "/workspace/private.md" }, selectedSkill)
    ).toMatchObject({
      status: "permission_denied",
      error: {
        code: "skill_vfs_path_not_allowed"
      }
    });
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
