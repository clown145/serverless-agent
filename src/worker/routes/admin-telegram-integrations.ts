import { encryptTelegramCredential } from "../../adapters/telegram/credential";
import { createPlatformCredentialRecord } from "../../storage/repositories/platform-credentials-repository";
import {
  createPlatformIntegrationRecord,
  listPlatformIntegrationRecords,
  updatePlatformIntegrationCredential
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { toTelegramIntegrationDto } from "./platforms/telegram-dto";
import { createTelegramIntegrationSchema, zodMessage } from "./platforms/telegram-schemas";

export async function handleAdminTelegramIntegrations(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method === "GET") {
    const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
      platform: "telegram"
    });
    return jsonResponse({
      ok: true,
      integrations: integrations.map(toTelegramIntegrationDto),
      webhookPath: "/webhooks/telegram"
    });
  }

  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const parsed = createTelegramIntegrationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const integration = await createPlatformIntegrationRecord(env.AGENT_DB, {
    agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    platform: "telegram",
    name: parsed.data.name,
    config: {
      parseMode: parsed.data.parseMode
    },
    webhookSecret: parsed.data.webhookSecret ?? crypto.randomUUID()
  });

  const saved = parsed.data.botToken
    ? await saveBotToken(env, integration.id, parsed.data.botToken)
    : integration;

  return jsonResponse({
    ok: true,
    integration: toTelegramIntegrationDto(saved)
  });
}

export async function saveBotToken(env: Env, integrationId: string, token: string) {
  const encrypted = await encryptTelegramCredential(env, token);
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
    throw new Error("Telegram integration not found after credential save");
  }

  return updated;
}
