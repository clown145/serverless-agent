import { saveWeixinOcTokenCredential } from "../../adapters/weixin-oc/credential";
import { createPlatformIntegrationRecord } from "../../storage/repositories/platform-integrations-repository";
import {
  listPlatformIntegrationRecords
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";
import { toWeixinOcIntegrationDto } from "./platforms/weixin-oc-dto";
import {
  createWeixinOcIntegrationSchema,
  zodMessage
} from "./platforms/weixin-oc-schemas";

export async function handleAdminWeixinOcIntegrations(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "GET") {
    const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
      platform: "weixin_oc"
    });
    return jsonResponse({
      ok: true,
      integrations: integrations.map(toWeixinOcIntegrationDto)
    });
  }

  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const parsed = createWeixinOcIntegrationSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const integration = await createPlatformIntegrationRecord(env.AGENT_DB, {
    agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    platform: "weixin_oc",
    name: parsed.data.name,
    config: {
      baseUrl: parsed.data.baseUrl,
      cdnBaseUrl: parsed.data.cdnBaseUrl,
      botType: parsed.data.botType,
      qrPollIntervalMs: parsed.data.qrPollIntervalMs,
      longPollTimeoutMs: parsed.data.longPollTimeoutMs,
      apiTimeoutMs: parsed.data.apiTimeoutMs,
      accountId: parsed.data.accountId,
      syncBuf: "",
      contextTokens: {}
    }
  });

  const saved = parsed.data.token
    ? await saveWeixinOcTokenCredential(env, integration.id, parsed.data.token)
    : integration;

  return jsonResponse({
    ok: true,
    integration: toWeixinOcIntegrationDto(saved)
  });
}

