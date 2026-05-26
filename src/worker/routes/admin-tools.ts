import { createToolCatalog } from "../../tools/catalog/tool-catalog";
import { createRuntimeToolRegistry } from "../../tools/registry/tool-registry";
import { jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { getToolSettings } from "../../storage/repositories/tool-settings-repository";
import { toToolSettingsDto } from "./tools/tool-settings-dto";

export async function handleAdminTools(request: Request, env: Env): Promise<Response> {
  const agentId =
    new URL(request.url).searchParams.get("agentId") ?? env.DEFAULT_AGENT_ID ?? "default";
  const [registry, settings] = await Promise.all([
    createRuntimeToolRegistry(env),
    getToolSettings(env.AGENT_DB, agentId)
  ]);

  return jsonResponse({
    ok: true,
    tools: createToolCatalog(registry.list()),
    settings: toToolSettingsDto(settings)
  });
}
