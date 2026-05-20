import type { Env } from "../../../shared/types/env";
import {
  findActivePlatformIntegration,
  listPlatformIntegrationRecords
} from "../../../storage/repositories/platform-integrations-repository";
import type { PlatformIntegrationRecord } from "../../../storage/repositories/platform-integration-types";
import { resolveQqOfficialCredential } from "./credential";
import { qqOfficialIntentMask } from "./intents";
import type { QqOfficialGatewayIntent } from "./types";

export type QqOfficialBotConfig = {
  agentId: string;
  appId?: string;
  secret?: string;
  integrationId?: string;
  isSandbox: boolean;
  intent: QqOfficialGatewayIntent;
  source: "platform_integration" | "env";
  integration?: PlatformIntegrationRecord;
};

export async function resolveQqOfficialBotForAgent(
  env: Env,
  agentId: string
): Promise<QqOfficialBotConfig> {
  const integration = await findActivePlatformIntegration(env.AGENT_DB, {
    agentId,
    platform: "qq"
  });

  if (integration) {
    return integrationQqOfficialConfig(env, integration);
  }

  return envQqOfficialConfig(env, agentId);
}

export async function listQqOfficialBots(
  env: Env
): Promise<QqOfficialBotConfig[]> {
  const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
    platform: "qq"
  });

  if (integrations.length > 0) {
    return Promise.all(
      integrations
        .filter((integration) => integration.status === "active")
        .map((integration) => integrationQqOfficialConfig(env, integration))
    );
  }

  const agentId = env.DEFAULT_AGENT_ID ?? "default";
  const fallback = envQqOfficialConfig(env, agentId);
  return fallback.appId || fallback.secret ? [fallback] : [];
}

export function qqOfficialObjectName(config: Pick<QqOfficialBotConfig, "agentId" | "appId" | "integrationId">): string {
  return [
    config.agentId,
    config.integrationId ?? "env",
    config.appId ?? "unknown"
  ].join(":");
}

async function integrationQqOfficialConfig(
  env: Env,
  integration: PlatformIntegrationRecord
): Promise<QqOfficialBotConfig> {
  const config = integration.config;
  const appId = stringConfig(config.appId) ?? stringConfig(config.appid);
  const secret =
    (await resolveQqOfficialCredential(env, integration)) ??
    stringConfig(config.secret);

  return {
    agentId: integration.agentId,
    appId,
    secret,
    integrationId: integration.id,
    isSandbox: booleanConfig(config.isSandbox) ?? booleanConfig(config.is_sandbox) ?? false,
    intent: qqOfficialIntentMask({
      enableGroupC2c:
        booleanConfig(config.enableGroupC2c) ??
        booleanConfig(config.enable_group_c2c) ??
        true,
      enableGuildDirectMessage:
        booleanConfig(config.enableGuildDirectMessage) ??
        booleanConfig(config.enable_guild_direct_message) ??
        true,
      enablePublicGuildMessages:
        booleanConfig(config.enablePublicGuildMessages) ??
        booleanConfig(config.enable_public_guild_messages) ??
        true
    }),
    source: "platform_integration",
    integration
  };
}

function envQqOfficialConfig(env: Env, agentId: string): QqOfficialBotConfig {
  return {
    agentId,
    appId: env.QQ_OFFICIAL_APP_ID,
    secret: env.QQ_OFFICIAL_SECRET,
    isSandbox: env.QQ_OFFICIAL_SANDBOX === "true",
    intent: qqOfficialIntentMask({
      enableGroupC2c: env.QQ_OFFICIAL_ENABLE_GROUP_C2C !== "false",
      enableGuildDirectMessage:
        env.QQ_OFFICIAL_ENABLE_GUILD_DIRECT_MESSAGE !== "false",
      enablePublicGuildMessages:
        env.QQ_OFFICIAL_ENABLE_PUBLIC_GUILD_MESSAGES !== "false"
    }),
    source: "env"
  };
}

function stringConfig(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanConfig(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
