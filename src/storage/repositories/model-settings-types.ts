import {
  normalizeModelCapabilities,
  type ModelCapability
} from "../../core/model/capability-defaults";

export type ModelProviderType = "openai" | "gemini" | "mock" | "custom";

export type ModelAuthType = "none" | "bearer" | "x-goog-api-key" | "api-key-header" | "query-param";

export type ModelListStrategy = "openai" | "gemini" | "static";

export type ChatProtocol = "openai-chat-completions" | "gemini-generate-content";

export type ModelCatalogStatus = "available" | "enabled" | "disabled" | "unavailable";

export type ModelCapabilitiesSource =
  | "manual"
  | "provider"
  | "models.dev"
  | "openrouter"
  | "inferred";

export type ModelMetadataSource = "provider" | "models.dev" | "openrouter" | "inferred";

export type ModelMetadataConfidence = "exact" | "alias" | "inferred" | "unknown";

export type ModelRole = "default" | "summary" | "vision";

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
  capabilities: ModelCapability[];
  capabilitiesSource: ModelCapabilitiesSource;
  contextWindow?: number;
  maxOutputTokens?: number;
  metadata?: Record<string, unknown>;
  metadataSource?: ModelMetadataSource;
  metadataConfidence?: ModelMetadataConfidence;
  metadataFetchedAt?: string;
  status: ModelCatalogStatus;
  createdAt: string;
  updatedAt: string;
};

export type ModelSettingsRecord = {
  agentId: string;
  providerId?: string;
  modelId?: string;
  updatedAt: string;
};

export type ModelRoleSettingRecord = {
  agentId: string;
  role: ModelRole;
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
  capabilities_json?: string | null;
  capabilities_source?: string | null;
  context_window?: number | null;
  max_output_tokens?: number | null;
  metadata_json?: string | null;
  metadata_source?: string | null;
  metadata_confidence?: string | null;
  metadata_fetched_at?: string | null;
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

export type ModelRoleSettingRow = {
  agent_id: string;
  role: string;
  provider_id?: string | null;
  model_id?: string | null;
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
    capabilities: normalizeModelCapabilities(row.capabilities_json, row.model_id),
    capabilitiesSource: normalizeCapabilitiesSource(row.capabilities_source),
    contextWindow: normalizePositiveInteger(row.context_window),
    maxOutputTokens: normalizePositiveInteger(row.max_output_tokens),
    metadata: parseMetadataJson(row.metadata_json),
    metadataSource: normalizeMetadataSource(row.metadata_source),
    metadataConfidence: normalizeMetadataConfidence(row.metadata_confidence),
    metadataFetchedAt: row.metadata_fetched_at ?? undefined,
    status: normalizeModelCatalogStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeModelCatalogStatus(value: string): ModelCatalogStatus {
  switch (value) {
    case "enabled":
    case "disabled":
    case "unavailable":
      return value;
    default:
      return "available";
  }
}

function normalizeCapabilitiesSource(value: string | null | undefined): ModelCapabilitiesSource {
  if (
    value === "manual" ||
    value === "provider" ||
    value === "models.dev" ||
    value === "openrouter" ||
    value === "inferred"
  ) {
    return value;
  }

  return "inferred";
}

function normalizeMetadataSource(
  value: string | null | undefined
): ModelMetadataSource | undefined {
  if (
    value === "provider" ||
    value === "models.dev" ||
    value === "openrouter" ||
    value === "inferred"
  ) {
    return value;
  }

  return undefined;
}

function normalizeMetadataConfidence(
  value: string | null | undefined
): ModelMetadataConfidence | undefined {
  if (value === "exact" || value === "alias" || value === "inferred" || value === "unknown") {
    return value;
  }

  return undefined;
}

function normalizePositiveInteger(value: number | null | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  return undefined;
}

function parseMetadataJson(value: string | null | undefined): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function mapModelSettingsRow(row: ModelSettingsRow): ModelSettingsRecord {
  return {
    agentId: row.agent_id,
    providerId: row.provider_id ?? undefined,
    modelId: row.model_id ?? undefined,
    updatedAt: row.updated_at
  };
}

export function mapModelRoleSettingRow(
  row: ModelRoleSettingRow
): ModelRoleSettingRecord | undefined {
  const role = normalizeModelRole(row.role);
  if (!role) {
    return undefined;
  }

  return {
    agentId: row.agent_id,
    role,
    providerId: row.provider_id ?? undefined,
    modelId: row.model_id ?? undefined,
    updatedAt: row.updated_at
  };
}

export function normalizeModelRole(value: string): ModelRole | undefined {
  if (value === "default" || value === "summary" || value === "vision") {
    return value;
  }

  return undefined;
}

function defaultAuthType(type: ModelProviderType): ModelAuthType {
  if (type === "gemini") {
    return "query-param";
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
