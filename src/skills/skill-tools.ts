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
  _toolName: string,
  selectedSkill?: SelectedSkill
): boolean {
  return true;
}

export function skillAllowsToolDefinition(
  _tool: RegisteredTool,
  _selectedSkill: SelectedSkill
): boolean {
  return true;
}
