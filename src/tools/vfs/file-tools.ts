import { createVfsWorkspace } from "../../vfs/services/workspace-service";
import { builtinTool } from "../builtin/source";
import type { RegisteredTool } from "../types";
import { failed } from "./result";
import {
  listDirInputJsonSchema,
  listDirInputSchema,
  readFileInputJsonSchema,
  readFileInputSchema,
  searchInputJsonSchema,
  searchInputSchema,
  writeFileInputJsonSchema,
  writeFileInputSchema
} from "./schema";

export function createVfsFileTools(): RegisteredTool[] {
  return [readFileTool(), writeFileTool(), listDirTool(), searchTool()];
}

function readFileTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "vfs.read_file",
      title: "Read VFS File",
      description: "Read a file from the agent virtual filesystem.",
      inputSchema: readFileInputJsonSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      },
      permission: { level: 1, scopes: ["workspace:read"] },
      sideEffect: "none",
      timeoutMs: 5_000
    },
    execute: async (context) => {
      const parsed = readFileInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const workspace = createVfsWorkspace(context);
      const file = await workspace.readFile(parsed.data.path);
      return { status: "success", output: file };
    }
  });
}

function writeFileTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "vfs.write_file",
      title: "Write VFS File",
      description: "Write a file into the agent virtual filesystem.",
      inputSchema: writeFileInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: false
      },
      permission: { level: 2, scopes: ["workspace:write"] },
      sideEffect: "workspace_write",
      timeoutMs: 10_000
    },
    execute: async (context) => {
      const parsed = writeFileInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const workspace = createVfsWorkspace(context);
      const entry = await workspace.writeFile(parsed.data);
      return { status: "success", output: entry };
    }
  });
}

function listDirTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "vfs.list_dir",
      title: "List VFS Directory",
      description: "List entries in a VFS directory.",
      inputSchema: listDirInputJsonSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      },
      permission: { level: 1, scopes: ["workspace:read"] },
      sideEffect: "none",
      timeoutMs: 5_000
    },
    execute: async (context) => {
      const parsed = listDirInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const workspace = createVfsWorkspace(context);
      const entries = await workspace.listDir(parsed.data.path);
      return { status: "success", output: entries };
    }
  });
}

function searchTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "vfs.search",
      title: "Search VFS",
      description: "Search VFS paths and D1-backed text file contents.",
      inputSchema: searchInputJsonSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      },
      permission: { level: 1, scopes: ["workspace:read"] },
      sideEffect: "none",
      timeoutMs: 8_000
    },
    execute: async (context) => {
      const parsed = searchInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const workspace = createVfsWorkspace(context);
      const matches = await workspace.search(parsed.data);
      return { status: "success", output: matches };
    }
  });
}
