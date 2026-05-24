import {
  createStandardSkill,
  listSkills,
  upsertStandardSkill
} from "../../skills/skill-service";
import { ensureBuiltinSkills } from "../../skills/builtin/provision";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { createSkillSchema, zodMessage } from "./skills/skill-schemas";

export async function handleAdminSkills(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method === "GET") {
    const agentId = new URL(request.url).searchParams.get("agentId") ??
      env.DEFAULT_AGENT_ID ??
      "default";
    await ensureBuiltinSkills(env, agentId);
    return jsonResponse({ ok: true, skills: await listSkills(env, agentId) });
  }

  if (request.method === "POST") {
    const parsed = createSkillSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const agentId = parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default";
    try {
      const skill = parsed.data.content
        ? await upsertStandardSkill(env, {
            agentId,
            skillId: parsed.data.skillId,
            content: parsed.data.content,
            createdBy: "admin"
          })
        : await createStandardSkill(env, {
            agentId,
            skillId: parsed.data.skillId,
            name: parsed.data.name ?? parsed.data.skillId,
            description: parsed.data.description ?? `Use this skill for ${parsed.data.skillId}.`,
            body: parsed.data.body ?? `# ${parsed.data.name ?? parsed.data.skillId}\n`,
            createdBy: "admin"
          });
      return jsonResponse({ ok: true, skill });
    } catch (error) {
      return errorResponse(
        400,
        "skill_create_failed",
        error instanceof Error ? error.message : "Skill create failed"
      );
    }
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
