import { executeVfsCommand } from "../../vfs/commands";
import { VfsError } from "../../vfs/core/errors";
import { createVfsWorkspace } from "../../vfs/services/workspace-service";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";

type WriteVfsPayload = {
  agentId?: string;
  path: string;
  content: string;
  mimeType?: string;
};

type VfsActionPayload =
  | {
      agentId?: string;
      action: "mkdir";
      path: string;
    }
  | {
      agentId?: string;
      action: "move";
      fromPath: string;
      toPath: string;
    }
  | {
      agentId?: string;
      action: "command";
      command: string;
      cwd?: string;
    };

export async function handleAdminVfs(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "GET") {
    return handleReadOrList(request, env);
  }

  if (request.method === "PUT") {
    return handleWrite(request, env);
  }

  if (request.method === "POST") {
    return handleAction(request, env);
  }

  if (request.method === "DELETE") {
    return handleDelete(request, env);
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

async function handleReadOrList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") ?? env.DEFAULT_AGENT_ID ?? "default";
  const path = url.searchParams.get("path") ?? "/";
  const mode = url.searchParams.get("mode") ?? "list";
  const workspace = createVfsWorkspace({ env, agentId, actorId: "admin" });

  try {
    if (mode === "file") {
      const file = await workspace.readFile(path);
      return jsonResponse({ ok: true, file });
    }

    if (mode === "tree") {
      const entries = await workspace.listTree(path, 500);
      return jsonResponse({ ok: true, entries });
    }

    if (mode === "search") {
      const query = url.searchParams.get("query") ?? "";
      const matches = await workspace.search({ path, query, limit: 50 });
      return jsonResponse({ ok: true, matches });
    }

    const entries = await workspace.listDir(path);
    return jsonResponse({ ok: true, entries });
  } catch (error) {
    return vfsErrorResponse(error, "VFS read failed");
  }
}

async function handleWrite(request: Request, env: Env): Promise<Response> {
  const payload = (await request.json()) as WriteVfsPayload;
  if (!payload.path) {
    return errorResponse(400, "invalid_payload", "`path` is required");
  }

  if (payload.content === undefined) {
    return errorResponse(400, "invalid_payload", "`content` is required");
  }

  try {
    const agentId = payload.agentId ?? env.DEFAULT_AGENT_ID ?? "default";
    const workspace = createVfsWorkspace({ env, agentId, actorId: "admin" });
    const entry = await workspace.writeFile({
      path: payload.path,
      content: payload.content,
      mimeType: payload.mimeType
    });

    return jsonResponse({ ok: true, entry });
  } catch (error) {
    return vfsErrorResponse(error, "VFS write failed");
  }
}

async function handleAction(request: Request, env: Env): Promise<Response> {
  const payload = (await request.json()) as VfsActionPayload;
  const agentId = payload.agentId ?? env.DEFAULT_AGENT_ID ?? "default";
  const workspace = createVfsWorkspace({ env, agentId, actorId: "admin" });

  try {
    if (payload.action === "mkdir") {
      if (!payload.path) {
        return errorResponse(400, "invalid_payload", "`path` is required");
      }

      const entry = await workspace.mkdir(payload.path);
      return jsonResponse({ ok: true, entry });
    }

    if (payload.action === "move") {
      if (!payload.fromPath || !payload.toPath) {
        return errorResponse(
          400,
          "invalid_payload",
          "`fromPath` and `toPath` are required"
        );
      }

      const entry = await workspace.move({
        fromPath: payload.fromPath,
        toPath: payload.toPath
      });
      return jsonResponse({ ok: true, entry });
    }

    if (payload.action === "command") {
      if (!payload.command) {
        return errorResponse(400, "invalid_payload", "`command` is required");
      }

      const result = await executeVfsCommand(
        { workspace },
        { command: payload.command, cwd: payload.cwd }
      );
      return jsonResponse({ ok: true, result });
    }

    return errorResponse(400, "invalid_payload", "Unknown VFS action");
  } catch (error) {
    return vfsErrorResponse(error, "VFS action failed");
  }
}

async function handleDelete(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") ?? env.DEFAULT_AGENT_ID ?? "default";
  const path = url.searchParams.get("path");
  const recursive = url.searchParams.get("recursive") === "true";

  if (!path) {
    return errorResponse(400, "invalid_payload", "`path` is required");
  }

  try {
    const workspace = createVfsWorkspace({ env, agentId, actorId: "admin" });
    const result = await workspace.delete({ path, recursive });
    return jsonResponse({ ok: true, result });
  } catch (error) {
    return vfsErrorResponse(error, "VFS delete failed");
  }
}

function vfsErrorResponse(error: unknown, fallback: string): Response {
  if (error instanceof VfsError) {
    const status = error.code === "vfs_not_found"
      ? 404
      : error.code === "vfs_conflict"
        ? 409
        : 400;
    return errorResponse(status, error.code, error.message);
  }

  return errorResponse(
    500,
    "vfs_error",
    error instanceof Error ? error.message : fallback
  );
}
