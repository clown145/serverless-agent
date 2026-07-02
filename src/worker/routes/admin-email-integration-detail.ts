import {
  deletePlatformIntegrationRecord,
  getPlatformIntegrationRecord,
  updatePlatformIntegrationNameAndConfig
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { saveEmailApiKey } from "./admin-email-integrations";
import { toEmailIntegrationDto } from "./platforms/email-dto";
import { updateEmailIntegrationSchema, zodMessage } from "./platforms/email-schemas";

export async function handleAdminEmailIntegrationDetail(
  request: Request,
  env: Env,
  integrationId: string
): Promise<Response> {
  if (request.method === "DELETE") {
    const deleted = await deletePlatformIntegrationRecord(env.AGENT_DB, integrationId);
    if (!deleted) {
      return errorResponse(404, "email_integration_not_found", "Email integration not found");
    }
    return jsonResponse({ ok: true, deleted });
  }

  const integration = await getPlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!integration || integration.platform !== "email") {
    return errorResponse(404, "email_integration_not_found", "Email integration not found");
  }

  if (request.method !== "PUT") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const parsed = updateEmailIntegrationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const { agentId, name, resendApiKey, ...configUpdate } = parsed.data;
  let updated = await updatePlatformIntegrationNameAndConfig(env.AGENT_DB, integration.id, {
    agentId,
    name,
    config: {
      ...integration.config,
      ...configUpdate
    }
  });
  if (resendApiKey) {
    updated = await saveEmailApiKey(env, integration.id, resendApiKey);
  }

  return jsonResponse({ ok: true, integration: toEmailIntegrationDto(updated ?? integration) });
}
