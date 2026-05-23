import {
  deleteSkillFile,
  listSkillFiles,
  readSkillFile,
  updateSkillFile
} from "../../skills/skill-service";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";
import {
  deleteSkillFileQuerySchema,
  skillFileQuerySchema,
  skillFilesQuerySchema,
  updateSkillSchema,
  zodMessage
} from "./skills/skill-schemas";
import {
  defaultAgentId,
  searchParamsObject,
  skillRouteError
} from "./skills/route-utils";

export async function handleAdminSkillFiles(
  request: Request,
  env: Env,
  skillId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "GET") {
    return handleReadOrList(request, env, skillId);
  }

  if (request.method === "PUT") {
    return handleWrite(request, env, skillId);
  }

  if (request.method === "DELETE") {
    return handleDelete(request, env, skillId);
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

async function handleReadOrList(
  request: Request,
  env: Env,
  skillId: string
): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "tree";

  if (mode === "file") {
    const parsed = skillFileQuerySchema.safeParse(searchParamsObject(url));
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    try {
      const file = await readSkillFile(env, {
        agentId: parsed.data.agentId ?? defaultAgentId(env),
        skillId,
        relativePath: parsed.data.relativePath
      });
      return jsonResponse({ ok: true, file });
    } catch (error) {
      return skillRouteError("skill_file_failed", error, "Skill file read failed");
    }
  }

  const parsed = skillFilesQuerySchema.safeParse(searchParamsObject(url));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  try {
    const entries = await listSkillFiles(env, {
      agentId: parsed.data.agentId ?? defaultAgentId(env),
      skillId,
      limit: parsed.data.limit
    });
    return jsonResponse({ ok: true, entries });
  } catch (error) {
    return skillRouteError("skill_file_failed", error, "Skill file tree failed");
  }
}

async function handleWrite(
  request: Request,
  env: Env,
  skillId: string
): Promise<Response> {
  const parsed = updateSkillSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  try {
    const skill = await updateSkillFile(env, {
      agentId: parsed.data.agentId ?? defaultAgentId(env),
      skillId,
      relativePath: parsed.data.relativePath,
      content: parsed.data.content,
      createdBy: "admin"
    });
    return jsonResponse({ ok: true, skill });
  } catch (error) {
    return skillRouteError("skill_file_failed", error, "Skill file write failed");
  }
}

async function handleDelete(
  request: Request,
  env: Env,
  skillId: string
): Promise<Response> {
  const url = new URL(request.url);
  const parsed = deleteSkillFileQuerySchema.safeParse(searchParamsObject(url));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  try {
    const result = await deleteSkillFile(env, {
      agentId: parsed.data.agentId ?? defaultAgentId(env),
      skillId,
      relativePath: parsed.data.relativePath,
      recursive: parsed.data.recursive
    });
    return jsonResponse({ ok: true, result });
  } catch (error) {
    return skillRouteError("skill_file_failed", error, "Skill file delete failed");
  }
}
