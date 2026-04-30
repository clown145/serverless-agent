import {
  getVfsFile,
  listVfsEntries,
  putVfsFile
} from "../../storage/repositories/vfs-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";

type WriteVfsPayload = {
  agentId?: string;
  path: string;
  content: string;
  mimeType?: string;
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

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

async function handleReadOrList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") ?? env.DEFAULT_AGENT_ID ?? "default";
  const path = url.searchParams.get("path") ?? "/";
  const mode = url.searchParams.get("mode") ?? "list";

  if (mode === "file") {
    const file = await getVfsFile(env, agentId, path);
    return jsonResponse({ ok: true, file });
  }

  const entries = await listVfsEntries(env, agentId, path);
  return jsonResponse({ ok: true, entries });
}

async function handleWrite(request: Request, env: Env): Promise<Response> {
  const payload = (await request.json()) as WriteVfsPayload;
  if (!payload.path) {
    return errorResponse(400, "invalid_payload", "`path` is required");
  }

  if (payload.content === undefined) {
    return errorResponse(400, "invalid_payload", "`content` is required");
  }

  const entry = await putVfsFile(env, {
    agentId: payload.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    path: payload.path,
    content: payload.content,
    mimeType: payload.mimeType,
    createdBy: "admin"
  });

  return jsonResponse({ ok: true, entry });
}
