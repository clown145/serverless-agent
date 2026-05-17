import type { Env } from "../../shared/types/env";
import {
  findActivePlatformIntegration,
  listPlatformIntegrationRecords
} from "../../storage/repositories/platform-integrations-repository";
import type { PlatformIntegrationRecord } from "../../storage/repositories/platform-integration-types";
import { resolveQqCredential } from "./credential";
import type { QqCredential, QqEnvironment, QqIntegrationConfig } from "./types";

export type QqBotConfig = {
  agentId: string;
  credential?: QqCredential;
  webhookSecret?: string;
  environment: QqEnvironment;
  source: "platform_integration";
  integration: PlatformIntegrationRecord;
};

export async function resolveQqBotForAgent(
  env: Env,
  agentId: string
): Promise<QqBotConfig | undefined> {
  const integration = await findActivePlatformIntegration(env.AGENT_DB, {
    agentId,
    platform: "qq"
  });
  return integration ? toQqBotConfig(env, integration) : undefined;
}

export async function resolveQqBotForWebhook(
  env: Env,
  input: { appId?: string; webhookSecret?: string }
): Promise<QqBotConfig | undefined> {
  const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
    platform: "qq"
  });
  for (const integration of integrations) {
    if (input.webhookSecret && integration.webhookSecret !== input.webhookSecret) {
      continue;
    }
    const credential = await resolveQqCredential(env, integration);
    if (!input.appId || credential?.appId === input.appId) {
      return toQqBotConfig(env, integration, credential);
    }
  }

  return undefined;
}

export function normalizeQqEnvironment(value: unknown): QqEnvironment {
  return value === "production" ? "production" : "sandbox";
}

async function toQqBotConfig(
  env: Env,
  integration: PlatformIntegrationRecord,
  credential?: QqCredential
): Promise<QqBotConfig> {
  const config = integration.config as QqIntegrationConfig;
  return {
    agentId: integration.agentId,
    credential: credential ?? await resolveQqCredential(env, integration),
    webhookSecret: integration.webhookSecret,
    environment: normalizeQqEnvironment(config.environment),
    source: "platform_integration",
    integration
  };
}
