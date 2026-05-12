import {
  deleteTelegramWebhook,
  getTelegramMe,
  getTelegramWebhookInfo,
  setTelegramBotCommands,
  setTelegramWebhook
} from "../../../adapters/telegram/api";
import { createTelegramBotCommands } from "../../../adapters/telegram/commands";
import { resolveTelegramCredential } from "../../../adapters/telegram/credential";
import {
  getPlatformIntegrationRecord,
  updatePlatformIntegrationCheck
} from "../../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../../shared/http";
import type { Env } from "../../../shared/types/env";
import { toTelegramIntegrationDto } from "./telegram-dto";
import { setTelegramWebhookSchema, zodMessage } from "./telegram-schemas";

type TelegramIntegration = NonNullable<
  Awaited<ReturnType<typeof getPlatformIntegrationRecord>>
>;

export async function testTelegramIntegration(
  env: Env,
  integration: TelegramIntegration
): Promise<Response> {
  const token = await resolveTelegramCredential(env, integration);
  if (!token) {
    return errorResponse(400, "telegram_token_missing", "Telegram bot token is missing");
  }

  try {
    const bot = await getTelegramMe(token);
    const webhook = await getTelegramWebhookInfo(token);
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});
    return jsonResponse({
      ok: true,
      integration: toTelegramIntegrationDto(integration),
      bot,
      webhook
    });
  } catch (error) {
    return recordTelegramActionError(env, integration.id, "telegram_test_failed", error);
  }
}

export async function setTelegramIntegrationWebhook(
  request: Request,
  env: Env,
  integration: TelegramIntegration
): Promise<Response> {
  const parsed = setTelegramWebhookSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const token = await resolveTelegramCredential(env, integration);
  if (!token) {
    return errorResponse(400, "telegram_token_missing", "Telegram bot token is missing");
  }

  const webhookUrl = parsed.data.webhookUrl ?? defaultWebhookUrl(request);
  try {
    await setTelegramWebhook({
      token,
      url: webhookUrl,
      secretToken: integration.webhookSecret ?? ""
    });
    const commands = await syncBotCommands(token);
    const webhook = await getTelegramWebhookInfo(token);
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});
    return jsonResponse({
      ok: true,
      integration: toTelegramIntegrationDto(integration),
      webhookUrl,
      webhook,
      commands
    });
  } catch (error) {
    return recordTelegramActionError(env, integration.id, "telegram_webhook_failed", error);
  }
}

export async function syncTelegramIntegrationCommands(
  env: Env,
  integration: TelegramIntegration
): Promise<Response> {
  const token = await resolveTelegramCredential(env, integration);
  if (!token) {
    return errorResponse(400, "telegram_token_missing", "Telegram bot token is missing");
  }

  try {
    const commands = await syncBotCommands(token);
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});
    return jsonResponse({
      ok: true,
      integration: toTelegramIntegrationDto(integration),
      commands
    });
  } catch (error) {
    return recordTelegramActionError(
      env,
      integration.id,
      "telegram_commands_sync_failed",
      error
    );
  }
}

export async function deleteTelegramIntegrationWebhook(
  env: Env,
  integration: TelegramIntegration
): Promise<Response> {
  const token = await resolveTelegramCredential(env, integration);
  if (!token) {
    return errorResponse(400, "telegram_token_missing", "Telegram bot token is missing");
  }

  try {
    await deleteTelegramWebhook(token);
    const webhook = await getTelegramWebhookInfo(token);
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});
    return jsonResponse({ ok: true, webhook });
  } catch (error) {
    return recordTelegramActionError(
      env,
      integration.id,
      "telegram_webhook_delete_failed",
      error
    );
  }
}

async function recordTelegramActionError(
  env: Env,
  integrationId: string,
  code: string,
  error: unknown
): Promise<Response> {
  const message = error instanceof Error ? error.message : "Telegram action failed";
  await updatePlatformIntegrationCheck(env.AGENT_DB, integrationId, {
    lastError: message
  });
  return errorResponse(502, code, message);
}

function defaultWebhookUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/webhooks/telegram`;
}

async function syncBotCommands(token: string) {
  const commands = createTelegramBotCommands();
  await setTelegramBotCommands(token, commands);
  return commands;
}
