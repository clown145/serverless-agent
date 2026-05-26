import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  getToolSettings,
  setToolSettings
} from "../../storage/repositories/tool-settings-repository";
import { toToolSettingsDto } from "./tools/tool-settings-dto";
import { updateToolSettingsSchema, zodMessage } from "./tools/tool-settings-schemas";

export async function handleAdminToolSettings(request: Request, env: Env): Promise<Response> {
  const agentId =
    new URL(request.url).searchParams.get("agentId") ?? env.DEFAULT_AGENT_ID ?? "default";

  if (request.method === "GET") {
    const settings = await getToolSettings(env.AGENT_DB, agentId);
    return jsonResponse({ ok: true, settings: toToolSettingsDto(settings) });
  }

  if (request.method === "PUT") {
    const parsed = updateToolSettingsSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const settings = await setToolSettings(env.AGENT_DB, {
      agentId: parsed.data.agentId ?? agentId,
      maxToolCallsPerRun: parsed.data.maxToolCallsPerRun
    });

    return jsonResponse({ ok: true, settings: toToolSettingsDto(settings) });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
