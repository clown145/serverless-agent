import { listPlatformIntegrationRecords } from "../../storage/repositories/platform-integrations-repository";
import type { PlatformIntegrationRecord } from "../../storage/repositories/platform-integration-types";
import type { Env } from "../../shared/types/env";
import { diagnosticOk, diagnosticWarn } from "../check-result";
import type { DiagnosticCheck } from "../types";

export async function checkPlatformConfig(
  env: Env,
  agentId: string
): Promise<DiagnosticCheck[]> {
  const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
    agentId,
    platform: "telegram"
  });
  const activeIntegrations = integrations.filter(
    (integration) => integration.status === "active"
  );
  const usableIntegrations = activeIntegrations.filter(
    (integration) => integration.credentialId && integration.webhookSecret
  );
  const envTelegramConfigured = Boolean(env.TELEGRAM_BOT_TOKEN);

  return [
    telegramIntegrationsCheck(activeIntegrations.length, envTelegramConfigured),
    telegramCredentialsCheck({
      usableCount: usableIntegrations.length,
      hasEnvToken: envTelegramConfigured,
      hasEnvWebhookSecret: Boolean(env.TELEGRAM_WEBHOOK_SECRET)
    }),
    telegramLastCheck(activeIntegrations)
  ];
}

function telegramIntegrationsCheck(
  count: number,
  envTelegramConfigured: boolean
): DiagnosticCheck {
  if (count) {
    return diagnosticOk(
      "platforms",
      "telegram_integrations",
      "Telegram integrations",
      `${count} active integration(s)`
    );
  }

  return envTelegramConfigured
    ? diagnosticWarn(
        "platforms",
        "telegram_integrations",
        "Telegram integrations",
        "No WebUI Telegram integration; using environment token fallback",
        "Create a Telegram integration in WebUI"
      )
    : diagnosticWarn(
        "platforms",
        "telegram_integrations",
        "Telegram integrations",
        "Telegram is not configured",
        "Create a Telegram integration"
      );
}

function telegramCredentialsCheck(input: {
  usableCount: number;
  hasEnvToken: boolean;
  hasEnvWebhookSecret: boolean;
}): DiagnosticCheck {
  if (input.usableCount) {
    return diagnosticOk(
      "platforms",
      "telegram_credentials",
      "Telegram token and secret",
      `${input.usableCount} integration(s) have token and webhook secret`
    );
  }

  if (input.hasEnvToken) {
    return diagnosticWarn(
      "platforms",
      "telegram_credentials",
      "Telegram token and secret",
      input.hasEnvWebhookSecret
        ? "Environment token and webhook secret available"
        : "Environment token available; webhook secret is optional only when no integration secret exists",
      "Prefer WebUI integration with generated webhook secret"
    );
  }

  return diagnosticWarn(
    "platforms",
    "telegram_credentials",
    "Telegram token and secret",
    "No Telegram bot token found",
    "Save a Telegram bot token"
  );
}

function telegramLastCheck(
  activeIntegrations: PlatformIntegrationRecord[]
): DiagnosticCheck {
  const errored = activeIntegrations.filter((integration) => integration.lastError);
  if (errored.length) {
    return diagnosticWarn(
      "platforms",
      "telegram_last_check",
      "Telegram last check",
      errored.map((integration) => `${integration.name}: ${integration.lastError}`).join("; "),
      "Use Test bot or Set webhook again"
    );
  }

  return activeIntegrations.some((integration) => integration.lastCheckedAt)
    ? diagnosticOk(
        "platforms",
        "telegram_last_check",
        "Telegram last check",
        "No recorded Telegram errors"
      )
    : diagnosticWarn(
        "platforms",
        "telegram_last_check",
        "Telegram last check",
        "No Telegram test or webhook check recorded",
        "Run Test bot or Set webhook"
      );
}
