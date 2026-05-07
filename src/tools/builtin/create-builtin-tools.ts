import { createMessagingTools } from "../messaging/tools";
import type { RegisteredTool } from "../types";
import { createVfsTools } from "../vfs/tools";

export function createBuiltinTools(): RegisteredTool[] {
  return [...createMessagingTools(), ...createVfsTools()];
}
