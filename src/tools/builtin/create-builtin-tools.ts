import { createMessagingTools } from "../messaging/tools";
import { createHttpTools } from "../http/tools";
import { createScheduleTools } from "../schedule/tools";
import { createSearchTools } from "../search/tools";
import { createSkillTools } from "../skills/tools";
import { createTimeTools } from "../time/tools";
import type { RegisteredTool } from "../types";
import { createVfsTools } from "../vfs/tools";
import { createWebTools } from "../web/tools";

export function createBuiltinTools(): RegisteredTool[] {
  return [
    ...createMessagingTools(),
    ...createScheduleTools(),
    ...createVfsTools(),
    ...createSkillTools(),
    ...createTimeTools(),
    ...createSearchTools(),
    ...createHttpTools(),
    ...createWebTools()
  ];
}
