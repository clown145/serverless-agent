import type { Env } from "../../shared/types/env";
import {
  findActivePlatformIntegration,
  findPlatformIntegrationByWebhookSecret
} from "../../storage/repositories/platform-integrations-repository";
import type { PlatformIntegrationRecord } from "../../storage/repositories/platform-integration-types";
import { resolveWecomCredential } from "./credential";

export type WecomCustomerServiceConfig = {
  agentId: string;
  corpId?: string;
  secret?: string;
  token?: string;
  encodingAesKey?: string;
  apiBaseUrl: string;
  customerServiceName?: string;
  openKfId?: string;
  webhookSecret?: string;
  integrationId?: string;
  source: "platform_integration";
  integration: PlatformIntegrationRecord;
};

export async function resolveWecomForAgent(
  env: Env,
  agentId: string
): Promise<WecomCustomerServiceConfig | undefined> {
  const integration = await findActivePlatformIntegration(env.AGENT_DB, {
    agentId,
    platform: "wecom"
  });
  return integration ? integrationWecomConfig(env, integration) : undefined;
}

export async function resolveWecomForWebhook(
  env: Env,
  webhookSecret: string | undefined
): Promise<WecomCustomerServiceConfig | undefined> {
  if (!webhookSecret) {
    return undefined;
  }

  const integration = await findPlatformIntegrationByWebhookSecret(env.AGENT_DB, {
    platform: "wecom",
    webhookSecret
  });
  return integration ? integrationWecomConfig(env, integration) : undefined;
}

export async function integrationWecomConfig(
  env: Env,
  integration: PlatformIntegrationRecord
): Promise<WecomCustomerServiceConfig> {
  return {
    agentId: integration.agentId,
    corpId: stringConfig(integration.config.corpId) ?? stringConfig(integration.config.corpid),
    secret:
      (await resolveWecomCredential(env, integration)) ??
      stringConfig(integration.config.secret),
    token: stringConfig(integration.config.token),
    encodingAesKey:
      stringConfig(integration.config.encodingAesKey) ??
      stringConfig(integration.config.encoding_aes_key),
    apiBaseUrl:
      stringConfig(integration.config.apiBaseUrl) ??
      stringConfig(integration.config.api_base_url) ??
      "https://qyapi.weixin.qq.com/cgi-bin/",
    customerServiceName:
      stringConfig(integration.config.customerServiceName) ??
      stringConfig(integration.config.kfName) ??
      stringConfig(integration.config.kf_name),
    openKfId:
      stringConfig(integration.config.openKfId) ??
      stringConfig(integration.config.open_kfid),
    webhookSecret: integration.webhookSecret,
    integrationId: integration.id,
    source: "platform_integration",
    integration
  };
}

export function stringConfig(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
