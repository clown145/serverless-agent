import type { PlatformIntegrationRecord } from "../../../storage/repositories/platform-integration-types";
import {
  DEFAULT_TELEGRAM_PARSE_MODE,
  normalizeTelegramParseMode,
  type TelegramParseMode
} from "../../../adapters/telegram/formatting";

export type TelegramIntegrationDto = {
  id: string;
  agentId: string;
  name: string;
  status: string;
  webhookSecretConfigured: boolean;
  parseMode: TelegramParseMode;
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
    parseMode: normalizeTelegramParseMode(
      integration.config.parseMode ?? DEFAULT_TELEGRAM_PARSE_MODE
    ),
    hasCredential: Boolean(integration.credentialId),
    lastCheckedAt: integration.lastCheckedAt,
    lastError: integration.lastError,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt
  };
}
