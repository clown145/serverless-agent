export type PlatformIntegrationPlatform = "telegram" | "qq" | "wecom" | "webhook";

export type PlatformIntegrationRecord = {
  id: string;
  agentId: string;
  platform: PlatformIntegrationPlatform;
  name: string;
  credentialId?: string;
  config: Record<string, unknown>;
  webhookSecret?: string;
  status: string;
  lastCheckedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlatformIntegrationRow = {
  id: string;
  agent_id: string;
  platform: PlatformIntegrationPlatform;
  name: string;
  credential_id?: string | null;
  config_json: string;
  webhook_secret?: string | null;
  status: string;
  last_checked_at?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformCredentialRecord = {
  id: string;
  integrationId: string;
  encryptedValue: string;
  iv: string;
  algorithm: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PlatformCredentialRow = {
  id: string;
  integration_id: string;
  encrypted_value: string;
  iv: string;
  algorithm: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export function mapPlatformIntegrationRow(
  row: PlatformIntegrationRow
): PlatformIntegrationRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    platform: row.platform,
    name: row.name,
    credentialId: row.credential_id ?? undefined,
    config: parseConfig(row.config_json),
    webhookSecret: row.webhook_secret ?? undefined,
    status: row.status,
    lastCheckedAt: row.last_checked_at ?? undefined,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapPlatformCredentialRow(
  row: PlatformCredentialRow
): PlatformCredentialRecord {
  return {
    id: row.id,
    integrationId: row.integration_id,
    encryptedValue: row.encrypted_value,
    iv: row.iv,
    algorithm: row.algorithm,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseConfig(configJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(configJson) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
