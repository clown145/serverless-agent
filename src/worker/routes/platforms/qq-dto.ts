import { normalizeQqEnvironment } from "../../../adapters/qq/config";
import type { QqEnvironment } from "../../../adapters/qq/types";
import type { PlatformIntegrationRecord } from "../../../storage/repositories/platform-integration-types";

export type QqIntegrationDto = {
  id: string;
  agentId: string;
  name: string;
  status: string;
  environment: QqEnvironment;
  webhookSecretConfigured: boolean;
  hasCredential: boolean;
  lastCheckedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export function toQqIntegrationDto(
  integration: PlatformIntegrationRecord
): QqIntegrationDto {
  return {
    id: integration.id,
    agentId: integration.agentId,
    name: integration.name,
    status: integration.status,
    environment: normalizeQqEnvironment(integration.config.environment),
    webhookSecretConfigured: Boolean(integration.webhookSecret),
    hasCredential: Boolean(integration.credentialId),
    lastCheckedAt: integration.lastCheckedAt,
    lastError: integration.lastError,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt
  };
}
