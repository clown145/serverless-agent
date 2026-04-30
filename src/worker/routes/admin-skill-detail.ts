import { loadSkill } from "../../skills/skill-loader";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";

export async function handleAdminSkillDetail(
  request: Request,
  env: Env,
  skillId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  try {
    const agentId = new URL(request.url).searchParams.get("agentId");
    const skill = await loadSkill(
      env,
      agentId ?? env.DEFAULT_AGENT_ID ?? "default",
      skillId
    );

    return jsonResponse({ ok: true, skill });
  } catch (error) {
    return errorResponse(
      404,
      "skill_not_found",
      error instanceof Error ? error.message : "Skill not found"
    );
  }
}
