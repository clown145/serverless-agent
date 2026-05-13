import type { ModelProviderRecord } from "../../storage/repositories/model-settings-types";
import {
  modelCapabilitiesFromMetadata,
  type ModelMetadataResolution
} from "./model-metadata";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

type OpenRouterModelsResponse = {
  data?: OpenRouterModel[];
};

type OpenRouterModel = {
  id?: string;
  name?: string;
  context_length?: number;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
  supported_parameters?: string[];
  pricing?: Record<string, unknown>;
};

type OpenRouterModelIndex = {
  byId: Map<string, OpenRouterModel>;
  bySlug: Map<string, OpenRouterModel[]>;
};

export async function fetchOpenRouterModelMetadata(
  provider: ModelProviderRecord,
  modelIds: string[]
): Promise<Map<string, ModelMetadataResolution>> {
  if (modelIds.length === 0) {
    return new Map();
  }

  const index = await fetchOpenRouterModelIndex();
  return new Map(
    modelIds
      .map((modelId) => [modelId, resolveOpenRouterModel(index, provider, modelId)] as const)
      .filter((entry): entry is [string, ModelMetadataResolution] => Boolean(entry[1]))
  );
}

async function fetchOpenRouterModelIndex(): Promise<OpenRouterModelIndex> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: { accept: "application/json" }
  });
  const payload = (await response.json().catch(() => undefined)) as
    | OpenRouterModelsResponse
    | { error?: { message?: string } }
    | undefined;

  if (!response.ok) {
    const message =
      payload && "error" in payload
        ? payload.error?.message
        : `OpenRouter model metadata failed ${response.status}`;
    throw new Error(message ?? `OpenRouter model metadata failed ${response.status}`);
  }

  const models = payload && "data" in payload ? payload.data ?? [] : [];
  return buildOpenRouterModelIndex(models);
}

function buildOpenRouterModelIndex(models: OpenRouterModel[]): OpenRouterModelIndex {
  const byId = new Map<string, OpenRouterModel>();
  const bySlug = new Map<string, OpenRouterModel[]>();

  for (const model of models) {
    if (!model.id) {
      continue;
    }

    const normalizedId = normalizeModelId(model.id);
    byId.set(normalizedId, model);
    const slug = modelIdSlug(model.id);
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), model]);
  }

  return { byId, bySlug };
}

function resolveOpenRouterModel(
  index: OpenRouterModelIndex,
  provider: ModelProviderRecord,
  modelId: string
): ModelMetadataResolution | undefined {
  const direct = index.byId.get(normalizeModelId(modelId));
  if (direct) {
    return toModelMetadataResolution(modelId, direct, "exact");
  }

  for (const candidateId of candidateOpenRouterIds(provider, modelId)) {
    const model = index.byId.get(normalizeModelId(candidateId));
    if (model) {
      return toModelMetadataResolution(modelId, model, "alias");
    }
  }

  const sameSlug = index.bySlug.get(modelIdSlug(modelId));
  if (sameSlug?.length === 1 && sameSlug[0]) {
    return toModelMetadataResolution(modelId, sameSlug[0], "alias");
  }

  return undefined;
}

function toModelMetadataResolution(
  requestedModelId: string,
  model: OpenRouterModel,
  confidence: "exact" | "alias"
): ModelMetadataResolution {
  return {
    capabilities: modelCapabilitiesFromMetadata({
      modelId: requestedModelId,
      inputModalities: model.architecture?.input_modalities,
      outputModalities: model.architecture?.output_modalities,
      supportedParameters: model.supported_parameters,
      contextWindow: model.context_length
    }),
    contextWindow: positiveInteger(model.context_length),
    maxOutputTokens: positiveInteger(model.top_provider?.max_completion_tokens),
    raw: compactOpenRouterMetadata(model),
    source: "openrouter",
    confidence,
    matchedModelId: model.id
  };
}

function candidateOpenRouterIds(
  provider: ModelProviderRecord,
  modelId: string
): string[] {
  const prefixes = providerPrefixes(provider);
  return prefixes.map((prefix) => `${prefix}/${stripProviderPrefix(modelId)}`);
}

function providerPrefixes(provider: ModelProviderRecord): string[] {
  if (provider.providerType === "gemini") {
    return ["google"];
  }

  if (provider.providerType === "openai") {
    return ["openai"];
  }

  const normalizedName = provider.name.trim().toLowerCase();
  if (normalizedName.includes("openrouter")) {
    return [];
  }

  if (normalizedName.includes("google") || normalizedName.includes("gemini")) {
    return ["google"];
  }

  if (normalizedName.includes("openai")) {
    return ["openai"];
  }

  return [];
}

function compactOpenRouterMetadata(model: OpenRouterModel): Record<string, unknown> {
  return {
    id: model.id,
    name: model.name,
    context_length: model.context_length,
    architecture: model.architecture,
    top_provider: model.top_provider,
    supported_parameters: model.supported_parameters,
    pricing: model.pricing
  };
}

function normalizeModelId(modelId: string): string {
  return modelId.trim().toLowerCase();
}

function stripProviderPrefix(modelId: string): string {
  const trimmed = modelId.trim();
  return trimmed.includes("/") ? trimmed.split("/").at(-1) ?? trimmed : trimmed;
}

function modelIdSlug(modelId: string): string {
  return stripProviderPrefix(modelId).toLowerCase();
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}
