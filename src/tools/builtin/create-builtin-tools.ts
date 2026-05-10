import { createMessagingTools } from "../messaging/tools";
import { createSearchTools } from "../search/tools";
import type { RegisteredTool } from "../types";
import { createVfsTools } from "../vfs/tools";
import { createWebTools } from "../web/tools";

export function createBuiltinTools(): RegisteredTool[] {
  return [
    ...createMessagingTools(),
    ...createVfsTools(),
    ...createSearchTools(),
    ...createWebTools()
  ];
}
