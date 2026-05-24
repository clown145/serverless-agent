import { encryptWecomSecret } from "../../adapters/wecom/credential";
import { createPlatformCredentialRecord } from "../../storage/repositories/platform-credentials-repository";
import {
  createPlatformIntegrationRecord,
  listPlatformIntegrationRecords,
  updatePlatformIntegrationCredential
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { toWecomIntegrationDto } from "./platforms/wecom-dto";
import {
  createWecomIntegrationSchema,
  zodMessage
} from "./platforms/wecom-schemas";

export async function handleAdminWecomIntegrations(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method === "GET") {
    const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
      platform: "wecom"
    });
    return jsonResponse({
      ok: true,
      integrations: integrations.map(toWecomIntegrationDto),
      webhookPath: "/webhooks/wecom/:webhookSecret"
    });
  }

  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const parsed = createWecomIntegrationSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const integration = await createPlatformIntegrationRecord(env.AGENT_DB, {
    agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    platform: "wecom",
    name: parsed.data.name,
    config: {
      corpId: parsed.data.corpId,
      token: parsed.data.token,
      encodingAesKey: parsed.data.encodingAesKey,
      apiBaseUrl: parsed.data.apiBaseUrl,
      customerServiceName: parsed.data.customerServiceName,
      openKfId: parsed.data.openKfId
    },
    webhookSecret: parsed.data.webhookSecret ?? crypto.randomUUID()
  });

  const saved = parsed.data.secret
    ? await saveWecomSecret(env, integration.id, parsed.data.secret)
    : integration;

  return jsonResponse({
    ok: true,
    integration: toWecomIntegrationDto(saved)
  });
}

export async function saveWecomSecret(
  env: Env,
  integrationId: string,
  secret: string
) {
  const encrypted = await encryptWecomSecret(env, secret);
  const credential = await createPlatformCredentialRecord(env.AGENT_DB, {
    integrationId,
    encryptedValue: encrypted.encryptedValue,
    iv: encrypted.iv,
    algorithm: encrypted.algorithm
  });
  const updated = await updatePlatformIntegrationCredential(
    env.AGENT_DB,
    integrationId,
    credential.id
  );

  if (!updated) {
    throw new Error("WeCom integration not found after credential save");
  }

  return updated;
}
