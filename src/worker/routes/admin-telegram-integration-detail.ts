import {
  deletePlatformIntegrationRecord,
  getPlatformIntegrationRecord,
  updatePlatformIntegrationConfig
} from "../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";
import {
  deleteTelegramIntegrationWebhook,
  setTelegramIntegrationWebhook,
  syncTelegramIntegrationCommands,
  testTelegramIntegration
} from "./platforms/telegram-admin-actions";
import { toTelegramIntegrationDto } from "./platforms/telegram-dto";
import {
  updateTelegramIntegrationSchema,
  zodMessage
} from "./platforms/telegram-schemas";

export async function handleAdminTelegramIntegrationDetail(
  request: Request,
  env: Env,
  integrationId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  const pathname = new URL(request.url).pathname;
  if (request.method === "DELETE" && !pathname.endsWith("/webhook")) {
    return deleteIntegration(env, integrationId);
  }

  const integration = await getPlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!integration || integration.platform !== "telegram") {
    return errorResponse(404, "telegram_integration_not_found", "Telegram integration not found");
  }

  if (request.method === "POST" && pathname.endsWith("/test")) {
    return testTelegramIntegration(env, integration);
  }

  if (request.method === "POST" && pathname.endsWith("/commands")) {
    return syncTelegramIntegrationCommands(env, integration);
  }

  if (request.method === "PUT") {
    const parsed = updateTelegramIntegrationSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const updated = await updatePlatformIntegrationConfig(env.AGENT_DB, integration.id, {
      ...integration.config,
      ...parsed.data
    });

    return jsonResponse({
      ok: true,
      integration: toTelegramIntegrationDto(updated ?? integration)
    });
  }

  if (request.method === "POST" && pathname.endsWith("/webhook")) {
    return setTelegramIntegrationWebhook(request, env, integration);
  }

  if (request.method === "DELETE" && pathname.endsWith("/webhook")) {
    return deleteTelegramIntegrationWebhook(env, integration);
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

async function deleteIntegration(env: Env, integrationId: string): Promise<Response> {
  const deleted = await deletePlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!deleted) {
    return errorResponse(404, "telegram_integration_not_found", "Telegram integration not found");
  }

  return jsonResponse({ ok: true, deleted });
}
