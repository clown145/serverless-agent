import { encryptString } from "../../security/encryption";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { createPlatformCredentialRecord } from "../../storage/repositories/platform-credentials-repository";
import {
  createPlatformIntegrationRecord,
  listPlatformIntegrationRecords,
  updatePlatformIntegrationCredential
} from "../../storage/repositories/platform-integrations-repository";
import { toEmailIntegrationDto } from "./platforms/email-dto";
import { createEmailIntegrationSchema, zodMessage } from "./platforms/email-schemas";

export async function handleAdminEmailIntegrations(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method === "GET") {
    const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, { platform: "email" });
    return jsonResponse({ ok: true, integrations: integrations.map(toEmailIntegrationDto) });
  }

  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const parsed = createEmailIntegrationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const integration = await createPlatformIntegrationRecord(env.AGENT_DB, {
    agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    platform: "email",
    name: parsed.data.name,
    config: {
      fromAddress: parsed.data.fromAddress,
      fromName: parsed.data.fromName,
      replyTo: parsed.data.replyTo,
      inboundAddresses: parsed.data.inboundAddresses
    }
  });
  const saved = parsed.data.resendApiKey
    ? await saveEmailApiKey(env, integration.id, parsed.data.resendApiKey)
    : integration;

  return jsonResponse({ ok: true, integration: toEmailIntegrationDto(saved) });
}

export async function saveEmailApiKey(env: Env, integrationId: string, apiKey: string) {
  if (!env.AGENT_MASTER_KEY) {
    throw new Error("AGENT_MASTER_KEY is required to save email credentials");
  }
  const encrypted = await encryptString(apiKey, env.AGENT_MASTER_KEY);
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
    throw new Error("Email integration not found after credential save");
  }
  return updated;
}
