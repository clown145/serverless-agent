export type SearchProviderType = "tavily" | "exa" | "custom";

export type SearchProviderRecord = {
  id: string;
  name: string;
  providerType: SearchProviderType;
  baseUrl?: string;
  credentialId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type SearchProviderCredentialRecord = {
  id: string;
  providerId: string;
  encryptedValue: string;
  iv: string;
  algorithm: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type SearchSettingsRecord = {
  agentId: string;
  providerId?: string;
  updatedAt: string;
};

export type SearchProviderRow = {
  id: string;
  name: string;
  provider_type: SearchProviderType;
  base_url?: string;
  credential_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SearchProviderCredentialRow = {
  id: string;
  provider_id: string;
  encrypted_value: string;
  iv: string;
  algorithm: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SearchSettingsRow = {
  agent_id: string;
  provider_id?: string;
  updated_at: string;
};

export function mapSearchProviderRow(row: SearchProviderRow): SearchProviderRecord {
  return {
    id: row.id,
    name: row.name,
    providerType: row.provider_type,
    baseUrl: row.base_url ?? undefined,
    credentialId: row.credential_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapSearchProviderCredentialRow(
  row: SearchProviderCredentialRow
): SearchProviderCredentialRecord {
  return {
    id: row.id,
    providerId: row.provider_id,
    encryptedValue: row.encrypted_value,
    iv: row.iv,
    algorithm: row.algorithm,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapSearchSettingsRow(row: SearchSettingsRow): SearchSettingsRecord {
  return {
    agentId: row.agent_id,
    providerId: row.provider_id ?? undefined,
    updatedAt: row.updated_at
  };
}
