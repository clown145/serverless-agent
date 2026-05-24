import type { RegisteredTool } from "../tools/types";
import type { ToolResult } from "../tools/types";
import { normalizeVfsPath } from "../vfs/core/path";
import type { SelectedSkill } from "./skill-selector";

const SKILL_SCOPED_VFS_TOOLS = new Set(["vfs.read_file", "vfs.list_dir", "vfs.search"]);
const SKILL_DENIED_VFS_TOOLS = new Set([
  "vfs.write_file",
  "vfs.mkdir",
  "vfs.delete",
  "vfs.move",
  "vfs.command"
]);

export function filterToolsForSkill(
  tools: RegisteredTool[],
  selectedSkill?: SelectedSkill
): RegisteredTool[] {
  if (!selectedSkill) {
    return tools;
  }

  return tools.filter((tool) => skillAllowsToolDefinition(tool, selectedSkill));
}

export function canUseToolWithSkill(toolName: string, selectedSkill?: SelectedSkill): boolean {
  if (!selectedSkill) {
    return true;
  }

  if (toolName.startsWith("vfs.")) {
    return SKILL_SCOPED_VFS_TOOLS.has(toolName) && !SKILL_DENIED_VFS_TOOLS.has(toolName);
  }

  return true;
}

export function skillAllowsToolDefinition(
  tool: RegisteredTool,
  selectedSkill: SelectedSkill
): boolean {
  return canUseToolWithSkill(tool.definition.name, selectedSkill);
}

export function validateSkillToolCall(
  toolName: string,
  input: unknown,
  selectedSkill?: SelectedSkill
): ToolResult | undefined {
  if (!selectedSkill) {
    return undefined;
  }

  if (!canUseToolWithSkill(toolName, selectedSkill)) {
    return skillToolDenied(toolName, selectedSkill);
  }

  if (!SKILL_SCOPED_VFS_TOOLS.has(toolName)) {
    return undefined;
  }

  const path = extractSinglePath(input);
  if (!path) {
    return {
      status: "permission_denied",
      error: {
        code: "skill_vfs_path_required",
        message: `Skill ${selectedSkill.skill.id} requires ${toolName} to include a VFS path`,
        retryable: false
      }
    };
  }

  if (!isPathInsideSkill(path, selectedSkill)) {
    return {
      status: "permission_denied",
      error: {
        code: "skill_vfs_path_not_allowed",
        message: `Skill ${selectedSkill.skill.id} can only access ${skillBasePath(selectedSkill)}`,
        retryable: false
      }
    };
  }

  return undefined;
}

export function skillBasePath(selectedSkill: SelectedSkill): string {
  return `/skills/${selectedSkill.skill.id}`;
}

function extractSinglePath(input: unknown): string | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = (input as { path?: unknown }).path;
  return typeof value === "string" ? value : undefined;
}

function isPathInsideSkill(path: string, selectedSkill: SelectedSkill): boolean {
  try {
    const normalized = normalizeVfsPath(path);
    const basePath = skillBasePath(selectedSkill);
    return normalized === basePath || normalized.startsWith(`${basePath}/`);
  } catch {
    return false;
  }
}

function skillToolDenied(toolName: string, selectedSkill: SelectedSkill): ToolResult {
  return {
    status: "permission_denied",
    error: {
      code: "skill_tool_not_allowed",
      message: `Skill ${selectedSkill.skill.id} does not allow tool ${toolName}`,
      retryable: false
    }
  };
}
