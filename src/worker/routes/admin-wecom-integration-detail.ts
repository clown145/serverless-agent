import {
  deletePlatformIntegrationRecord,
  getPlatformIntegrationRecord,
  updatePlatformIntegrationConfig
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { saveWecomSecret } from "./admin-wecom-integrations";
import {
  createWecomContactWay,
  testWecomIntegration,
  withoutWecomSecret
} from "./platforms/wecom-admin-actions";
import { toWecomIntegrationDto } from "./platforms/wecom-dto";
import { updateWecomIntegrationSchema, zodMessage } from "./platforms/wecom-schemas";

export async function handleAdminWecomIntegrationDetail(
  request: Request,
  env: Env,
  integrationId: string
): Promise<Response> {
  if (request.method === "DELETE") {
    return deleteIntegration(env, integrationId);
  }

  const integration = await getPlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!integration || integration.platform !== "wecom") {
    return errorResponse(404, "wecom_integration_not_found", "WeCom integration not found");
  }

  const pathname = new URL(request.url).pathname;
  if (request.method === "POST" && pathname.endsWith("/test")) {
    return testWecomIntegration(env, integration);
  }

  if (request.method === "POST" && pathname.endsWith("/contact-way")) {
    return createWecomContactWay(request, env, integration);
  }

  if (request.method === "PUT") {
    const parsed = updateWecomIntegrationSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    let updated = await updatePlatformIntegrationConfig(env.AGENT_DB, integration.id, {
      ...integration.config,
      ...withoutWecomSecret(parsed.data)
    });
    if (parsed.data.secret) {
      updated = await saveWecomSecret(env, integration.id, parsed.data.secret);
    }

    return jsonResponse({
      ok: true,
      integration: toWecomIntegrationDto(updated ?? integration)
    });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

async function deleteIntegration(env: Env, integrationId: string): Promise<Response> {
  const deleted = await deletePlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!deleted) {
    return errorResponse(404, "wecom_integration_not_found", "WeCom integration not found");
  }

  return jsonResponse({ ok: true, deleted });
}
