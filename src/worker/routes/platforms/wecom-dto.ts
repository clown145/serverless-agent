import { buildQrCodeUrl } from "../../../adapters/wecom/contact";
import {
  normalizeApiBaseUrl
} from "../../../adapters/wecom/api";
import type { PlatformIntegrationRecord } from "../../../storage/repositories/platform-integration-types";

export type WecomIntegrationDto = {
  id: string;
  agentId: string;
  name: string;
  status: string;
  corpId?: string;
  apiBaseUrl: string;
  customerServiceName?: string;
  openKfId?: string;
  hasSecret: boolean;
  tokenConfigured: boolean;
  encodingAesKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  webhookPath: string;
  contactUrl?: string;
  qrCodeUrl?: string;
  lastCheckedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export function toWecomIntegrationDto(
  integration: PlatformIntegrationRecord
): WecomIntegrationDto {
  const contactUrl = stringConfig(integration.config.contactUrl);
  return {
    id: integration.id,
    agentId: integration.agentId,
    name: integration.name,
    status: integration.status,
    corpId: stringConfig(integration.config.corpId) ?? stringConfig(integration.config.corpid),
    apiBaseUrl: normalizeApiBaseUrl(
      stringConfig(integration.config.apiBaseUrl) ??
      stringConfig(integration.config.api_base_url)
    ),
    customerServiceName:
      stringConfig(integration.config.customerServiceName) ??
      stringConfig(integration.config.kfName) ??
      stringConfig(integration.config.kf_name),
    openKfId:
      stringConfig(integration.config.openKfId) ??
      stringConfig(integration.config.open_kfid),
    hasSecret: Boolean(integration.credentialId),
    tokenConfigured: Boolean(stringConfig(integration.config.token)),
    encodingAesKeyConfigured: Boolean(
      stringConfig(integration.config.encodingAesKey) ??
      stringConfig(integration.config.encoding_aes_key)
    ),
    webhookSecretConfigured: Boolean(integration.webhookSecret),
    webhookPath: `/webhooks/wecom/${integration.webhookSecret ?? ""}`,
    contactUrl,
    qrCodeUrl: contactUrl ? buildQrCodeUrl(contactUrl) : undefined,
    lastCheckedAt: integration.lastCheckedAt,
    lastError: integration.lastError,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt
  };
}

function stringConfig(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
