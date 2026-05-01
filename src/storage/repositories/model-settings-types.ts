export type ModelProviderType = "openai" | "gemini" | "mock" | "custom";

export type ModelAuthType =
  | "none"
  | "bearer"
  | "x-goog-api-key"
  | "api-key-header"
  | "query-param";

export type ModelListStrategy = "openai" | "gemini" | "static";

export type ChatProtocol =
  | "openai-chat-completions"
  | "gemini-generate-content";

export type ModelProviderRecord = {
  id: string;
  name: string;
  providerType: ModelProviderType;
  baseUrl?: string;
  apiKeySecret?: string;
  credentialId?: string;
  authType: ModelAuthType;
  authHeader?: string;
  authQueryParam?: string;
  modelListStrategy: ModelListStrategy;
  chatProtocol: ChatProtocol;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelCredentialRecord = {
  id: string;
  providerId: string;
  encryptedValue: string;
  iv: string;
  algorithm: string;
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
  api_key_secret?: string;
  credential_id?: string;
  auth_type?: ModelAuthType;
  auth_header?: string;
  auth_query_param?: string;
  model_list_strategy?: ModelListStrategy;
  chat_protocol?: ChatProtocol;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ModelCredentialRow = {
  id: string;
  provider_id: string;
  encrypted_value: string;
  iv: string;
  algorithm: string;
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
    apiKeySecret: row.api_key_secret || undefined,
    credentialId: row.credential_id ?? undefined,
    authType: row.auth_type ?? defaultAuthType(row.provider_type),
    authHeader: row.auth_header ?? undefined,
    authQueryParam: row.auth_query_param ?? undefined,
    modelListStrategy: row.model_list_strategy ?? defaultModelListStrategy(row.provider_type),
    chatProtocol: row.chat_protocol ?? defaultChatProtocol(row.provider_type),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapModelCredentialRow(row: ModelCredentialRow): ModelCredentialRecord {
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

function defaultAuthType(type: ModelProviderType): ModelAuthType {
  if (type === "gemini") {
    return "x-goog-api-key";
  }

  if (type === "mock") {
    return "none";
  }

  return "bearer";
}

function defaultModelListStrategy(type: ModelProviderType): ModelListStrategy {
  if (type === "gemini") {
    return "gemini";
  }

  if (type === "mock") {
    return "static";
  }

  return "openai";
}

function defaultChatProtocol(type: ModelProviderType): ChatProtocol {
  if (type === "gemini") {
    return "gemini-generate-content";
  }

  return "openai-chat-completions";
}
