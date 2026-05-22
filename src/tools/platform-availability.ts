import type { Platform } from "../shared/types/internal-message";
import type { RegisteredTool, ToolDefinition } from "./types";

export function toolAllowsPlatform(
  definition: ToolDefinition,
  platform: string | undefined
): boolean {
  if (!definition.platforms?.length) {
    return true;
  }
  return Boolean(platform && definition.platforms.includes(platform as Platform));
}

export function filterToolsForPlatform(
  tools: RegisteredTool[],
  platform: string | undefined
): RegisteredTool[] {
  return tools.filter((tool) => toolAllowsPlatform(tool.definition, platform));
}
