import {
  deletePlatformIntegrationRecord,
  getPlatformIntegrationRecord,
  updatePlatformIntegrationConfig
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";
import { toQqIntegrationDto } from "./platforms/qq-dto";
import { updateQqIntegrationSchema, zodMessage } from "./platforms/qq-schemas";

export async function handleAdminQqIntegrationDetail(
  request: Request,
  env: Env,
  integrationId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  const integration = await getPlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!integration || integration.platform !== "qq") {
    return errorResponse(404, "qq_integration_not_found", "QQ integration not found");
  }

  if (request.method === "GET") {
    return jsonResponse({ ok: true, integration: toQqIntegrationDto(integration) });
  }

  if (request.method === "PATCH") {
    const parsed = updateQqIntegrationSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const updated = await updatePlatformIntegrationConfig(env.AGENT_DB, integration.id, {
      ...integration.config,
      ...parsed.data
    });
    if (!updated) {
      return errorResponse(404, "qq_integration_not_found", "QQ integration not found");
    }
    return jsonResponse({ ok: true, integration: toQqIntegrationDto(updated) });
  }

  if (request.method === "DELETE") {
    const deleted = await deletePlatformIntegrationRecord(env.AGENT_DB, integrationId);
    if (!deleted) {
      return errorResponse(404, "qq_integration_not_found", "QQ integration not found");
    }
    return jsonResponse({ ok: true });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
