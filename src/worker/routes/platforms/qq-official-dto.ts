import type { PlatformIntegrationRecord } from "../../../storage/repositories/platform-integration-types";

export type QqOfficialIntegrationDto = {
  id: string;
  agentId: string;
  name: string;
  status: string;
  appId?: string;
  connectionMode: "gateway" | "webhook";
  webhookPath: string;
  isSandbox: boolean;
  enableGroupC2c: boolean;
  enableGuildDirectMessage: boolean;
  enablePublicGuildMessages: boolean;
  hasCredential: boolean;
  lastCheckedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export function toQqOfficialIntegrationDto(
  integration: PlatformIntegrationRecord
): QqOfficialIntegrationDto {
  return {
    id: integration.id,
    agentId: integration.agentId,
    name: integration.name,
    status: integration.status,
    appId: stringConfig(integration.config.appId) ?? stringConfig(integration.config.appid),
    connectionMode:
      stringConfig(integration.config.connectionMode) === "webhook" ? "webhook" : "gateway",
    webhookPath: `/webhooks/qq-official/${integration.webhookSecret ?? integration.id}`,
    isSandbox:
      booleanConfig(integration.config.isSandbox) ??
      booleanConfig(integration.config.is_sandbox) ??
      false,
    enableGroupC2c:
      booleanConfig(integration.config.enableGroupC2c) ??
      booleanConfig(integration.config.enable_group_c2c) ??
      true,
    enableGuildDirectMessage:
      booleanConfig(integration.config.enableGuildDirectMessage) ??
      booleanConfig(integration.config.enable_guild_direct_message) ??
      true,
    enablePublicGuildMessages:
      booleanConfig(integration.config.enablePublicGuildMessages) ??
      booleanConfig(integration.config.enable_public_guild_messages) ??
      true,
    hasCredential: Boolean(integration.credentialId),
    lastCheckedAt: integration.lastCheckedAt,
    lastError: integration.lastError,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt
  };
}

function stringConfig(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanConfig(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
