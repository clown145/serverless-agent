import type { RegisteredTool } from "../tools/types";
import type { SelectedSkill } from "./skill-selector";

export function filterToolsForSkill(
  tools: RegisteredTool[],
  selectedSkill?: SelectedSkill
): RegisteredTool[] {
  if (!selectedSkill) {
    return tools;
  }

  return tools.filter((tool) => skillAllowsToolDefinition(tool, selectedSkill));
}

export function canUseToolWithSkill(
  toolName: string,
  selectedSkill?: SelectedSkill
): boolean {
  if (!selectedSkill) {
    return true;
  }

  return selectedSkill.skill.manifest.tools.includes(toolName);
}

export function skillAllowsToolDefinition(
  tool: RegisteredTool,
  selectedSkill: SelectedSkill
): boolean {
  const manifest = selectedSkill.skill.manifest;
  if (!manifest.tools.includes(tool.definition.name)) {
    return false;
  }

  if (tool.definition.permission.level > manifest.permissions.requiredLevel) {
    return false;
  }

  return tool.definition.permission.scopes.every((scope) => {
    return manifest.permissions.scopes.includes(scope);
  });
}
