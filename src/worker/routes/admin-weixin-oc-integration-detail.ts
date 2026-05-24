import { saveWeixinOcTokenCredential } from "../../adapters/weixin-oc/credential";
import {
  deletePlatformIntegrationRecord,
  getPlatformIntegrationRecord,
  updatePlatformIntegrationNameAndConfig
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  connectWeixinOcIntegration,
  disconnectWeixinOcIntegration,
  getWeixinOcIntegrationStatus,
  startWeixinOcLogin
} from "./platforms/weixin-oc-admin-actions";
import { toWeixinOcIntegrationDto } from "./platforms/weixin-oc-dto";
import {
  updateWeixinOcIntegrationSchema,
  zodMessage
} from "./platforms/weixin-oc-schemas";

export async function handleAdminWeixinOcIntegrationDetail(
  request: Request,
  env: Env,
  integrationId: string
): Promise<Response> {
  if (request.method === "DELETE") {
    return deleteIntegration(env, integrationId);
  }

  const integration = await getPlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!integration || integration.platform !== "weixin_oc") {
    return errorResponse(404, "weixin_oc_integration_not_found", "Weixin OC integration not found");
  }

  const pathname = new URL(request.url).pathname;
  if (request.method === "POST" && pathname.endsWith("/connect")) {
    return connectWeixinOcIntegration(env, integration);
  }

  if (request.method === "POST" && pathname.endsWith("/login")) {
    return startWeixinOcLogin(env, integration);
  }

  if (request.method === "POST" && pathname.endsWith("/disconnect")) {
    return disconnectWeixinOcIntegration(env, integration);
  }

  if (request.method === "GET" && pathname.endsWith("/status")) {
    return getWeixinOcIntegrationStatus(env, integration);
  }

  if (request.method === "PUT") {
    const parsed = updateWeixinOcIntegrationSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const { token, name, ...configUpdate } = parsed.data;
    let updated = await updatePlatformIntegrationNameAndConfig(env.AGENT_DB, integration.id, {
      name,
      config: {
        ...integration.config,
        ...configUpdate
      }
    });
    if (token) {
      updated = await saveWeixinOcTokenCredential(env, integration.id, token);
    }

    return jsonResponse({
      ok: true,
      integration: toWeixinOcIntegrationDto(updated ?? integration)
    });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

async function deleteIntegration(env: Env, integrationId: string): Promise<Response> {
  const deleted = await deletePlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!deleted) {
    return errorResponse(404, "weixin_oc_integration_not_found", "Weixin OC integration not found");
  }

  return jsonResponse({ ok: true, deleted });
}
