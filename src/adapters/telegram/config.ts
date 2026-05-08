import type { Env } from "../../shared/types/env";
import {
  findActivePlatformIntegration,
  findPlatformIntegrationByWebhookSecret,
  listPlatformIntegrationRecords
} from "../../storage/repositories/platform-integrations-repository";
import type { PlatformIntegrationRecord } from "../../storage/repositories/platform-integration-types";
import { resolveTelegramCredential } from "./credential";

export type TelegramBotConfig = {
  agentId: string;
  token?: string;
  webhookSecret?: string;
  source: "platform_integration" | "env";
  integration?: PlatformIntegrationRecord;
};

export async function resolveTelegramBotForAgent(
  env: Env,
  agentId: string
): Promise<TelegramBotConfig> {
  const integration = await findActivePlatformIntegration(env.AGENT_DB, {
    agentId,
    platform: "telegram"
  });

  if (integration) {
    return {
      agentId: integration.agentId,
      token: await resolveTelegramCredential(env, integration),
      webhookSecret: integration.webhookSecret,
      source: "platform_integration",
      integration
    };
  }

  return envTelegramConfig(env, agentId);
}

export async function resolveTelegramBotForWebhook(
  env: Env,
  secret: string | undefined
): Promise<TelegramBotConfig | undefined> {
  if (secret) {
    const integration = await findPlatformIntegrationByWebhookSecret(env.AGENT_DB, {
      platform: "telegram",
      webhookSecret: secret
    });
    if (integration) {
      return {
        agentId: integration.agentId,
        token: await resolveTelegramCredential(env, integration),
        webhookSecret: integration.webhookSecret,
        source: "platform_integration",
        integration
      };
    }
  }

  if (env.TELEGRAM_WEBHOOK_SECRET) {
    return secret === env.TELEGRAM_WEBHOOK_SECRET
      ? envTelegramConfig(env, env.DEFAULT_AGENT_ID ?? "default")
      : undefined;
  }

  const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
    platform: "telegram"
  });
  if (integrations.some((integration) => integration.webhookSecret)) {
    return undefined;
  }

  return envTelegramConfig(env, env.DEFAULT_AGENT_ID ?? "default");
}

function envTelegramConfig(env: Env, agentId: string): TelegramBotConfig {
  return {
    agentId,
    token: env.TELEGRAM_BOT_TOKEN,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
    source: "env"
  };
}
