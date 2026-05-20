import {
  deletePlatformIntegrationRecord,
  getPlatformIntegrationRecord,
  updatePlatformIntegrationConfig
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";
import { saveQqOfficialSecret } from "./admin-qq-official-integrations";
import {
  connectQqOfficialIntegration,
  disconnectQqOfficialIntegration,
  getQqOfficialIntegrationStatus,
  testQqOfficialIntegration
} from "./platforms/qq-official-admin-actions";
import { toQqOfficialIntegrationDto } from "./platforms/qq-official-dto";
import {
  updateQqOfficialIntegrationSchema,
  zodMessage
} from "./platforms/qq-official-schemas";

export async function handleAdminQqOfficialIntegrationDetail(
  request: Request,
  env: Env,
  integrationId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "DELETE") {
    return deleteIntegration(env, integrationId);
  }

  const integration = await getPlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!integration || integration.platform !== "qq") {
    return errorResponse(404, "qq_official_integration_not_found", "QQ official integration not found");
  }

  const pathname = new URL(request.url).pathname;
  if (request.method === "POST" && pathname.endsWith("/test")) {
    return testQqOfficialIntegration(env, integration);
  }

  if (request.method === "POST" && pathname.endsWith("/connect")) {
    return connectQqOfficialIntegration(env, integration);
  }

  if (request.method === "POST" && pathname.endsWith("/disconnect")) {
    return disconnectQqOfficialIntegration(env, integration);
  }

  if (request.method === "GET" && pathname.endsWith("/status")) {
    return getQqOfficialIntegrationStatus(env, integration);
  }

  if (request.method === "PUT") {
    const parsed = updateQqOfficialIntegrationSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    let updated = await updatePlatformIntegrationConfig(env.AGENT_DB, integration.id, {
      ...integration.config,
      ...withoutSecret(parsed.data)
    });
    if (parsed.data.secret) {
      updated = await saveQqOfficialSecret(env, integration.id, parsed.data.secret);
    }

    return jsonResponse({
      ok: true,
      integration: toQqOfficialIntegrationDto(updated ?? integration)
    });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

async function deleteIntegration(env: Env, integrationId: string): Promise<Response> {
  const deleted = await deletePlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!deleted) {
    return errorResponse(404, "qq_official_integration_not_found", "QQ official integration not found");
  }

  return jsonResponse({ ok: true, deleted });
}

function withoutSecret(input: { secret?: string; [key: string]: unknown }) {
  const { secret: _secret, ...config } = input;
  return config;
}
