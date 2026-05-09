import { createVfsWorkspace } from "../../vfs/services/workspace-service";
import { builtinTool } from "../builtin/source";
import type { RegisteredTool } from "../types";
import { failed } from "./result";
import {
  deleteInputJsonSchema,
  deleteInputSchema,
  mkdirInputJsonSchema,
  mkdirInputSchema,
  moveInputJsonSchema,
  moveInputSchema
} from "./schema";

export function createVfsMutationTools(): RegisteredTool[] {
  return [mkdirTool(), deleteTool(), moveTool()];
}

function mkdirTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "vfs.mkdir",
      title: "Create VFS Directory",
      description: "Create a directory in the agent virtual filesystem.",
      inputSchema: mkdirInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: false
      },
      permission: { level: 2, scopes: ["workspace:write"] },
      sideEffect: "workspace_write",
      timeoutMs: 5_000
    },
    execute: async (context) => {
      const parsed = mkdirInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const workspace = createVfsWorkspace(context);
      const entry = await workspace.mkdir(parsed.data.path);
      return { status: "success", output: entry };
    }
  });
}

function deleteTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "vfs.delete",
      title: "Delete VFS Entry",
      description: "Delete a file or directory from the agent virtual filesystem.",
      inputSchema: deleteInputJsonSchema,
      annotations: {
        destructiveHint: true,
        openWorldHint: false
      },
      permission: { level: 2, scopes: ["workspace:write"] },
      sideEffect: "workspace_write",
      timeoutMs: 8_000
    },
    execute: async (context) => {
      const parsed = deleteInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const workspace = createVfsWorkspace(context);
      const result = await workspace.delete(parsed.data);
      return { status: "success", output: result };
    }
  });
}

function moveTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "vfs.move",
      title: "Move VFS Entry",
      description: "Move or rename a VFS file or directory.",
      inputSchema: moveInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: false
      },
      permission: { level: 2, scopes: ["workspace:write"] },
      sideEffect: "workspace_write",
      timeoutMs: 8_000
    },
    execute: async (context) => {
      const parsed = moveInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const workspace = createVfsWorkspace(context);
      const entry = await workspace.move(parsed.data);
      return { status: "success", output: entry };
    }
  });
}
