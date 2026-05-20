import { encryptQqOfficialSecret } from "../../adapters/qq/official/secret";
import { createPlatformCredentialRecord } from "../../storage/repositories/platform-credentials-repository";
import {
  createPlatformIntegrationRecord,
  listPlatformIntegrationRecords,
  updatePlatformIntegrationCredential
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";
import { toQqOfficialIntegrationDto } from "./platforms/qq-official-dto";
import {
  createQqOfficialIntegrationSchema,
  zodMessage
} from "./platforms/qq-official-schemas";

export async function handleAdminQqOfficialIntegrations(
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
      integrations: integrations.map(toQqOfficialIntegrationDto)
    });
  }

  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const parsed = createQqOfficialIntegrationSchema.safeParse(
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
      appId: parsed.data.appId,
      isSandbox: parsed.data.isSandbox,
      enableGroupC2c: parsed.data.enableGroupC2c,
      enableGuildDirectMessage: parsed.data.enableGuildDirectMessage,
      enablePublicGuildMessages: parsed.data.enablePublicGuildMessages
    }
  });

  const saved = parsed.data.secret
    ? await saveQqOfficialSecret(env, integration.id, parsed.data.secret)
    : integration;

  return jsonResponse({
    ok: true,
    integration: toQqOfficialIntegrationDto(saved)
  });
}

export async function saveQqOfficialSecret(
  env: Env,
  integrationId: string,
  secret: string
) {
  const encrypted = await encryptQqOfficialSecret(env, secret);
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
    throw new Error("QQ official integration not found after credential save");
  }

  return updated;
}
