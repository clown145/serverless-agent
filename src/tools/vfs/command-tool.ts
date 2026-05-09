import { executeVfsCommand } from "../../vfs/commands";
import { createVfsWorkspace } from "../../vfs/services/workspace-service";
import { builtinTool } from "../builtin/source";
import type { RegisteredTool } from "../types";
import { failed } from "./result";
import {
  commandInputJsonSchema,
  commandInputSchema
} from "./schema";

export function createVfsCommandTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "vfs.command",
      title: "Run VFS Command",
      description:
        "Run a safe virtual filesystem command such as ls, cat, tree, grep, mkdir, rm, or mv.",
      inputSchema: commandInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: false
      },
      permission: { level: 2, scopes: ["workspace:read", "workspace:write"] },
      sideEffect: "workspace_write",
      timeoutMs: 10_000
    },
    execute: async (context) => {
      const parsed = commandInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const workspace = createVfsWorkspace(context);
      const result = await executeVfsCommand({ workspace }, parsed.data);
      return { status: "success", output: result };
    }
  });
}
