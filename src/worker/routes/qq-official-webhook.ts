import { handleQqOfficialWebhookPayload } from "../../adapters/qq/official/webhook";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  findPlatformIntegrationByWebhookSecret,
  getPlatformIntegrationRecord,
  updatePlatformIntegrationCheck
} from "../../storage/repositories/platform-integrations-repository";
import type { QqOfficialGatewayPayload } from "../../adapters/qq/official/types";

export async function handleQqOfficialWebhook(
  request: Request,
  env: Env,
  webhookSecret: string
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const integration =
    (await findPlatformIntegrationByWebhookSecret(env.AGENT_DB, {
      platform: "qq",
      webhookSecret
    })) ?? (await getPlatformIntegrationRecord(env.AGENT_DB, webhookSecret));
  if (!integration || integration.platform !== "qq") {
    return errorResponse(
      404,
      "qq_official_integration_not_found",
      "QQ official integration not found"
    );
  }

  try {
    const payload = (await request.json()) as QqOfficialGatewayPayload;
    const result = await handleQqOfficialWebhookPayload(env, integration, payload);
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});
    return jsonResponse(result.response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "QQ official webhook failed";
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {
      lastError: message
    });
    return errorResponse(400, "qq_official_webhook_failed", message);
  }
}
