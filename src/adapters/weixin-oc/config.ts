import type { Env } from "../../shared/types/env";
import {
  findActivePlatformIntegration,
  listPlatformIntegrationRecords
} from "../../storage/repositories/platform-integrations-repository";
import type { PlatformIntegrationRecord } from "../../storage/repositories/platform-integration-types";
import { resolveWeixinOcCredential } from "./credential";
import { getWeixinOcAccountState, numberConfig, stringConfig } from "./state";

export const DEFAULT_WEIXIN_OC_BASE_URL = "https://ilinkai.weixin.qq.com";
export const DEFAULT_WEIXIN_OC_CDN_BASE_URL = "https://novac2c.cdn.weixin.qq.com/c2c";
export const DEFAULT_WEIXIN_OC_BOT_TYPE = "3";
export const DEFAULT_WEIXIN_OC_QR_POLL_INTERVAL_MS = 1_000;
export const DEFAULT_WEIXIN_OC_LONG_POLL_TIMEOUT_MS = 35_000;
export const DEFAULT_WEIXIN_OC_API_TIMEOUT_MS = 15_000;

export type WeixinOcBotConfig = {
  agentId: string;
  integrationId: string;
  name: string;
  baseUrl: string;
  cdnBaseUrl: string;
  botType: string;
  qrPollIntervalMs: number;
  longPollTimeoutMs: number;
  apiTimeoutMs: number;
  token?: string;
  accountId?: string;
  syncBuf: string;
  contextTokens: Record<string, string>;
  integration: PlatformIntegrationRecord;
};

export async function resolveWeixinOcBotForAgent(
  env: Env,
  agentId: string
): Promise<WeixinOcBotConfig | undefined> {
  const integration = await findActivePlatformIntegration(env.AGENT_DB, {
    agentId,
    platform: "weixin_oc"
  });

  return integration ? integrationWeixinOcConfig(env, integration) : undefined;
}

export async function resolveWeixinOcBotByIntegrationId(
  env: Env,
  integrationId: string
): Promise<WeixinOcBotConfig | undefined> {
  const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
    platform: "weixin_oc"
  });
  const integration = integrations.find((item) => item.id === integrationId);
  return integration ? integrationWeixinOcConfig(env, integration) : undefined;
}

export async function listWeixinOcBots(env: Env): Promise<WeixinOcBotConfig[]> {
  const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
    platform: "weixin_oc"
  });

  return Promise.all(
    integrations
      .filter((integration) => integration.status === "active")
      .map((integration) => integrationWeixinOcConfig(env, integration))
  );
}

export function weixinOcObjectName(
  config: Pick<WeixinOcBotConfig, "agentId" | "integrationId">
): string {
  return `${config.agentId}:${config.integrationId}`;
}

async function integrationWeixinOcConfig(
  env: Env,
  integration: PlatformIntegrationRecord
): Promise<WeixinOcBotConfig> {
  const config = integration.config;
  const state = getWeixinOcAccountState(config);
  const credentialToken = await resolveWeixinOcCredential(env, integration);

  return {
    agentId: integration.agentId,
    integrationId: integration.id,
    name: integration.name,
    baseUrl: state.baseUrl ?? stringConfig(config.baseUrl) ?? DEFAULT_WEIXIN_OC_BASE_URL,
    cdnBaseUrl: stringConfig(config.cdnBaseUrl) ?? DEFAULT_WEIXIN_OC_CDN_BASE_URL,
    botType: stringConfig(config.botType) ?? DEFAULT_WEIXIN_OC_BOT_TYPE,
    qrPollIntervalMs: Math.max(
      1_000,
      numberConfig(config.qrPollIntervalMs) ?? DEFAULT_WEIXIN_OC_QR_POLL_INTERVAL_MS
    ),
    longPollTimeoutMs: Math.max(
      5_000,
      numberConfig(config.longPollTimeoutMs) ?? DEFAULT_WEIXIN_OC_LONG_POLL_TIMEOUT_MS
    ),
    apiTimeoutMs: Math.max(
      5_000,
      numberConfig(config.apiTimeoutMs) ?? DEFAULT_WEIXIN_OC_API_TIMEOUT_MS
    ),
    token: credentialToken ?? state.token,
    accountId: state.accountId,
    syncBuf: state.syncBuf ?? "",
    contextTokens: state.contextTokens,
    integration
  };
}

