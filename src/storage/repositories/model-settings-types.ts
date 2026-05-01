export type ModelProviderType = "openai" | "gemini" | "mock";

export type ModelProviderRecord = {
  id: string;
  name: string;
  providerType: ModelProviderType;
  baseUrl?: string;
  apiKeySecret: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelCatalogRecord = {
  id: string;
  providerId: string;
  modelId: string;
  displayName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelSettingsRecord = {
  agentId: string;
  providerId?: string;
  modelId?: string;
  updatedAt: string;
};

export type ModelProviderRow = {
  id: string;
  name: string;
  provider_type: ModelProviderType;
  base_url?: string;
  api_key_secret: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ModelCatalogRow = {
  id: string;
  provider_id: string;
  model_id: string;
  display_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ModelSettingsRow = {
  agent_id: string;
  provider_id?: string;
  model_id?: string;
  updated_at: string;
};

export function mapModelProviderRow(row: ModelProviderRow): ModelProviderRecord {
  return {
    id: row.id,
    name: row.name,
    providerType: row.provider_type,
    baseUrl: row.base_url ?? undefined,
    apiKeySecret: row.api_key_secret,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapModelCatalogRow(row: ModelCatalogRow): ModelCatalogRecord {
  return {
    id: row.id,
    providerId: row.provider_id,
    modelId: row.model_id,
    displayName: row.display_name ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapModelSettingsRow(row: ModelSettingsRow): ModelSettingsRecord {
  return {
    agentId: row.agent_id,
    providerId: row.provider_id ?? undefined,
    modelId: row.model_id ?? undefined,
    updatedAt: row.updated_at
  };
}
