import {
  listSkillFileRevisions,
  readSkillFileRevision,
  rollbackSkillFile
} from "../../skills/skill-service";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  skillRevisionQuerySchema,
  skillRevisionsQuerySchema,
  zodMessage
} from "./skills/skill-schemas";
import { defaultAgentId, searchParamsObject, skillRouteError } from "./skills/route-utils";

export async function handleAdminSkillRevisions(
  request: Request,
  env: Env,
  skillId: string,
  version?: number
): Promise<Response> {
  if (request.method === "GET" && version === undefined) {
    return handleList(request, env, skillId);
  }

  if (request.method === "GET" && version !== undefined) {
    return handleRead(request, env, skillId, version);
  }

  if (request.method === "POST" && version !== undefined) {
    return handleRollback(request, env, skillId, version);
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

async function handleList(request: Request, env: Env, skillId: string): Promise<Response> {
  const url = new URL(request.url);
  const parsed = skillRevisionsQuerySchema.safeParse(searchParamsObject(url));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  try {
    const revisions = await listSkillFileRevisions(env, {
      agentId: parsed.data.agentId ?? defaultAgentId(env),
      skillId,
      relativePath: parsed.data.relativePath,
      limit: parsed.data.limit
    });
    return jsonResponse({ ok: true, revisions });
  } catch (error) {
    return skillRouteError("skill_revision_failed", error, "Skill revision list failed");
  }
}

async function handleRead(
  request: Request,
  env: Env,
  skillId: string,
  version: number
): Promise<Response> {
  const url = new URL(request.url);
  const parsed = skillRevisionQuerySchema.safeParse(searchParamsObject(url));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  try {
    const revision = await readSkillFileRevision(env, {
      agentId: parsed.data.agentId ?? defaultAgentId(env),
      skillId,
      relativePath: parsed.data.relativePath,
      version
    });
    return jsonResponse({ ok: true, revision });
  } catch (error) {
    return skillRouteError("skill_revision_failed", error, "Skill revision read failed");
  }
}

async function handleRollback(
  request: Request,
  env: Env,
  skillId: string,
  version: number
): Promise<Response> {
  const url = new URL(request.url);
  const parsed = skillRevisionQuerySchema.safeParse(searchParamsObject(url));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  try {
    const skill = await rollbackSkillFile(env, {
      agentId: parsed.data.agentId ?? defaultAgentId(env),
      skillId,
      relativePath: parsed.data.relativePath,
      version,
      createdBy: "admin"
    });
    return jsonResponse({ ok: true, skill });
  } catch (error) {
    return skillRouteError("skill_revision_failed", error, "Skill revision rollback failed");
  }
}
