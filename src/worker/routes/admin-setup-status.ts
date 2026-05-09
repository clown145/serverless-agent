import { buildSetupStatus } from "../../setup/setup-status";
import { jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { getModelSettings } from "../../storage/repositories/agent-model-settings-repository";
import { listModelCatalog } from "../../storage/repositories/model-catalog-repository";
import { listModelProviders } from "../../storage/repositories/model-providers-repository";
import { getVfsWorkspaceBootstrapStatus } from "../../vfs/bootstrap/default-workspace";
import { requireAdmin } from "../admin-auth";

export async function handleAdminSetupStatus(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  const agentId =
    new URL(request.url).searchParams.get("agentId") ??
    env.DEFAULT_AGENT_ID ??
    "default";
  const [providers, models, settings, workspace] = await Promise.all([
    listModelProviders(env.AGENT_DB),
    listModelCatalog(env.AGENT_DB),
    getModelSettings(env.AGENT_DB, agentId),
    getVfsWorkspaceBootstrapStatus(env, agentId)
  ]);

  return jsonResponse({
    ok: true,
    status: buildSetupStatus({ providers, models, settings, workspace })
  });
}
