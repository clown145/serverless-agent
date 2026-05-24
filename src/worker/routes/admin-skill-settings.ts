import {
  getSkillSettings,
  setSkillEditConfirmationRequired
} from "../../storage/repositories/skill-settings-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  updateSkillSettingsSchema,
  zodMessage
} from "./skills/skill-schemas";

export async function handleAdminSkillSettings(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method === "GET") {
    const agentId = new URL(request.url).searchParams.get("agentId") ??
      env.DEFAULT_AGENT_ID ??
      "default";
    return jsonResponse({
      ok: true,
      settings: await getSkillSettings(env.AGENT_DB, agentId)
    });
  }

  if (request.method === "PUT") {
    const parsed = updateSkillSettingsSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const agentId = parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default";
    const settings = await setSkillEditConfirmationRequired(env.AGENT_DB, {
      agentId,
      required: parsed.data.editConfirmationRequired
    });
    return jsonResponse({ ok: true, settings });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
