import { loadSkill } from "../../skills/skill-loader";
import { deleteSkill, updateSkillFile } from "../../skills/skill-service";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { updateSkillSchema, zodMessage } from "./skills/skill-schemas";

export async function handleAdminSkillDetail(
  request: Request,
  env: Env,
  skillId: string
): Promise<Response> {
  const agentId =
    new URL(request.url).searchParams.get("agentId") ?? env.DEFAULT_AGENT_ID ?? "default";

  if (request.method === "GET") {
    try {
      const skill = await loadSkill(env, agentId, skillId);

      return jsonResponse({ ok: true, skill });
    } catch (error) {
      return errorResponse(
        404,
        "skill_not_found",
        error instanceof Error ? error.message : "Skill not found"
      );
    }
  }

  if (request.method === "PUT") {
    const parsed = updateSkillSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    try {
      const skill = await updateSkillFile(env, {
        agentId: parsed.data.agentId ?? agentId,
        skillId,
        relativePath: parsed.data.relativePath,
        content: parsed.data.content,
        createdBy: "admin"
      });
      return jsonResponse({ ok: true, skill });
    } catch (error) {
      return errorResponse(
        400,
        "skill_update_failed",
        error instanceof Error ? error.message : "Skill update failed"
      );
    }
  }

  if (request.method === "DELETE") {
    try {
      await deleteSkill(env, { agentId, skillId });
      return jsonResponse({ ok: true });
    } catch (error) {
      return errorResponse(
        400,
        "skill_delete_failed",
        error instanceof Error ? error.message : "Skill delete failed"
      );
    }
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
