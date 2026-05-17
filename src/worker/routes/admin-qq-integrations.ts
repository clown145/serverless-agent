import { encryptQqCredential } from "../../adapters/qq/credential";
import { createPlatformCredentialRecord } from "../../storage/repositories/platform-credentials-repository";
import {
  createPlatformIntegrationRecord,
  listPlatformIntegrationRecords,
  updatePlatformIntegrationCredential
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";
import { toQqIntegrationDto } from "./platforms/qq-dto";
import { createQqIntegrationSchema, zodMessage } from "./platforms/qq-schemas";

export async function handleAdminQqIntegrations(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "GET") {
    const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
      platform: "qq"
    });
    return jsonResponse({
      ok: true,
      integrations: integrations.map(toQqIntegrationDto),
      webhookPath: "/webhooks/qq"
    });
  }

  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const parsed = createQqIntegrationSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const integration = await createPlatformIntegrationRecord(env.AGENT_DB, {
    agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    platform: "qq",
    name: parsed.data.name,
    config: {
      environment: parsed.data.environment,
      eventMode: "webhook"
    },
    webhookSecret: parsed.data.webhookSecret ?? crypto.randomUUID()
  });
  const encrypted = await encryptQqCredential(env, {
    appId: parsed.data.appId,
    appSecret: parsed.data.appSecret
  });
  const credential = await createPlatformCredentialRecord(env.AGENT_DB, {
    integrationId: integration.id,
    encryptedValue: encrypted.encryptedValue,
    iv: encrypted.iv,
    algorithm: encrypted.algorithm
  });
  const saved = await updatePlatformIntegrationCredential(
    env.AGENT_DB,
    integration.id,
    credential.id
  );
  if (!saved) {
    throw new Error("QQ integration not found after credential save");
  }

  return jsonResponse({ ok: true, integration: toQqIntegrationDto(saved) });
}
