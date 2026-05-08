import type { PlatformIntegrationRecord } from "../../../storage/repositories/platform-integration-types";

export type TelegramIntegrationDto = {
  id: string;
  agentId: string;
  name: string;
  status: string;
  webhookSecretConfigured: boolean;
  hasCredential: boolean;
  lastCheckedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export function toTelegramIntegrationDto(
  integration: PlatformIntegrationRecord
): TelegramIntegrationDto {
  return {
    id: integration.id,
    agentId: integration.agentId,
    name: integration.name,
    status: integration.status,
    webhookSecretConfigured: Boolean(integration.webhookSecret),
    hasCredential: Boolean(integration.credentialId),
    lastCheckedAt: integration.lastCheckedAt,
    lastError: integration.lastError,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt
  };
}
