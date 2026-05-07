import type { RegisteredTool, ToolSource } from "../types";

export const BUILTIN_TOOL_SOURCE: ToolSource = {
  type: "builtin",
  id: "builtin",
  name: "Built-in presets"
};

export function builtinTool(tool: Omit<RegisteredTool, "source">): RegisteredTool {
  return {
    ...tool,
    source: BUILTIN_TOOL_SOURCE
  };
}
