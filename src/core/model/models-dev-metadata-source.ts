import type { ModelProviderRecord } from "../../storage/repositories/model-settings-types";
import {
  modelCapabilitiesFromMetadata,
  type ModelMetadataResolution
} from "./model-metadata";

const MODELS_DEV_URL = "https://models.dev/api.json";

type ModelsDevResponse = Record<string, ModelsDevProvider>;

type ModelsDevProvider = {
  id?: string;
  name?: string;
  api?: string;
  models?: Record<string, ModelsDevModel>;
};

type ModelsDevModel = {
  id?: string;
  name?: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
  limit?: {
    context?: number;
    input?: number;
    output?: number;
  };
  cost?: Record<string, unknown>;
};

export async function fetchModelsDevModelMetadata(
  provider: ModelProviderRecord,
  modelIds: string[]
): Promise<Map<string, ModelMetadataResolution>> {
  if (modelIds.length === 0) {
    return new Map();
  }

  const providers = await fetchModelsDevProviders();
  const modelsProvider = resolveModelsDevProvider(providers, provider);
  if (!modelsProvider?.models) {
    return new Map();
  }

  return new Map(
    modelIds
      .map((modelId) => {
        const model = modelsProvider.models?.[modelId];
        return [
          modelId,
          model ? toModelMetadataResolution(modelId, model) : undefined
        ] as const;
      })
      .filter((entry): entry is [string, ModelMetadataResolution] => Boolean(entry[1]))
  );
}

async function fetchModelsDevProviders(): Promise<ModelsDevResponse> {
  const response = await fetch(MODELS_DEV_URL, {
    headers: { accept: "application/json" }
  });
  const payload = (await response.json().catch(() => undefined)) as
    | ModelsDevResponse
    | undefined;

  if (!response.ok) {
    throw new Error(`models.dev metadata failed ${response.status}`);
  }

  return payload ?? {};
}

function resolveModelsDevProvider(
  providers: ModelsDevResponse,
  provider: ModelProviderRecord
): ModelsDevProvider | undefined {
  if (provider.providerType === "custom") {
    return (
      findProviderByBaseUrl(providers, provider.baseUrl) ??
      findProviderByCandidateIds(providers, candidateProviderIds(provider))
    );
  }

  return (
    findProviderByCandidateIds(providers, candidateProviderIds(provider)) ??
    findProviderByBaseUrl(providers, provider.baseUrl)
  );
}

function findProviderByCandidateIds(
  providers: ModelsDevResponse,
  providerIds: string[]
): ModelsDevProvider | undefined {
  for (const providerId of providerIds) {
    const match = providers[providerId];
    if (match) {
      return match;
    }
  }

  return undefined;
}

function candidateProviderIds(provider: ModelProviderRecord): string[] {
  const ids: string[] = [];

  if (provider.providerType === "gemini") {
    ids.push("google");
  }

  if (provider.providerType === "openai") {
    ids.push("openai");
  }

  const normalizedName = normalizeProviderName(provider.name, provider.providerType);
  if (normalizedName) {
    ids.push(normalizedName);
  }

  return [...new Set(ids)];
}

function findProviderByBaseUrl(
  providers: ModelsDevResponse,
  baseUrl: string | undefined
): ModelsDevProvider | undefined {
  if (!baseUrl) {
    return undefined;
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    return undefined;
  }

  return Object.values(providers).find((provider) => {
    return normalizeBaseUrl(provider.api) === normalizedBaseUrl;
  });
}

function toModelMetadataResolution(
  requestedModelId: string,
  model: ModelsDevModel
): ModelMetadataResolution {
  return {
    capabilities: modelCapabilitiesFromMetadata({
      modelId: requestedModelId,
      inputModalities: model.modalities?.input,
      outputModalities: model.modalities?.output,
      supportsTools: model.tool_call,
      supportsStructuredOutput: model.structured_output,
      contextWindow: model.limit?.context
    }),
    contextWindow: positiveInteger(model.limit?.context),
    maxOutputTokens: positiveInteger(model.limit?.output),
    raw: compactModelsDevMetadata(model),
    source: "models.dev",
    confidence: "exact",
    matchedModelId: model.id
  };
}

function compactModelsDevMetadata(model: ModelsDevModel): Record<string, unknown> {
  return {
    id: model.id,
    name: model.name,
    family: model.family,
    attachment: model.attachment,
    reasoning: model.reasoning,
    tool_call: model.tool_call,
    structured_output: model.structured_output,
    temperature: model.temperature,
    knowledge: model.knowledge,
    release_date: model.release_date,
    last_updated: model.last_updated,
    modalities: model.modalities,
    limit: model.limit,
    cost: model.cost
  };
}

function normalizeProviderName(
  name: string,
  providerType: ModelProviderRecord["providerType"]
): string | undefined {
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === "gemini") {
    return "google";
  }

  const providerId = normalized
    .replace(/\(.+\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (
    providerType === "custom" &&
    (providerId === "custom" || providerId === "openai" || providerId === "gemini")
  ) {
    return undefined;
  }

  return providerId || undefined;
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return value.trim().replace(/\/+$/, "") || undefined;
  }
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}
