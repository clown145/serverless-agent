import {
  getVfsFile,
  listVfsEntries,
  putVfsFile
} from "../../storage/repositories/vfs-repository";
import { builtinTool } from "../builtin/source";
import type { RegisteredTool, ToolResult } from "../types";
import {
  listDirInputJsonSchema,
  listDirInputSchema,
  readFileInputJsonSchema,
  readFileInputSchema,
  writeFileInputJsonSchema,
  writeFileInputSchema
} from "./schema";

export function createVfsTools(): RegisteredTool[] {
  return [readFileTool(), writeFileTool(), listDirTool()];
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

      const file = await getVfsFile(context.env, context.agentId, parsed.data.path);
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

      const entry = await putVfsFile(context.env, {
        agentId: context.agentId,
        path: parsed.data.path,
        content: parsed.data.content,
        mimeType: parsed.data.mimeType,
        createdBy: context.actorId
      });

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

      const entries = await listVfsEntries(
        context.env,
        context.agentId,
        parsed.data.path
      );

      return { status: "success", output: entries };
    }
  });
}

function failed(code: string, message: string, retryable: boolean): ToolResult {
  return {
    status: "failed",
    error: { code, message, retryable }
  };
}
