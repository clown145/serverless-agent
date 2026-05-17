import type { ModelProviderRecord } from "../../storage/repositories/model-settings-types";
import {
  modelCapabilitiesFromMetadata,
  type ModelMetadataResolution
} from "./model-metadata";

const MODELS_DEV_URL = "https://models.dev/api.json";
const MODELS_DEV_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let modelsDevIndexCache:
  | { expiresAt: number; index: Map<string, ModelsDevEntry[]> }
  | undefined;

export function clearModelsDevMetadataCache(): void {
  modelsDevIndexCache = undefined;
}

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

type ModelsDevEntry = {
  providerKey: string;
  modelKey: string;
  model: ModelsDevModel;
};

export async function fetchModelsDevModelMetadata(
  _provider: ModelProviderRecord,
  modelIds: string[]
): Promise<Map<string, ModelMetadataResolution>> {
  if (modelIds.length === 0) {
    return new Map();
  }

  const index = await getModelsDevIndex();

  return new Map(
    modelIds
      .map((modelId) => {
        const entry = resolveModelsDevEntry(index, modelId);
        return [
          modelId,
          entry ? toModelMetadataResolution(modelId, entry) : undefined
        ] as const;
      })
      .filter((entry): entry is [string, ModelMetadataResolution] => Boolean(entry[1]))
  );
}

async function getModelsDevIndex(): Promise<Map<string, ModelsDevEntry[]>> {
  const now = Date.now();
  if (modelsDevIndexCache && modelsDevIndexCache.expiresAt > now) {
    return modelsDevIndexCache.index;
  }

  const providers = await fetchModelsDevProviders();
  const index = buildModelsDevIndex(providers);
  modelsDevIndexCache = {
    expiresAt: now + MODELS_DEV_CACHE_TTL_MS,
    index
  };
  return index;
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

function buildModelsDevIndex(providers: ModelsDevResponse): Map<string, ModelsDevEntry[]> {
  const index = new Map<string, ModelsDevEntry[]>();

  for (const [providerKey, provider] of Object.entries(providers)) {
    for (const [modelKey, model] of Object.entries(provider.models ?? {})) {
      const entry = { providerKey, modelKey, model };
      addExactModelId(index, modelKey, entry);
      addExactModelId(index, model.id, entry);
    }
  }

  return index;
}

function addExactModelId(
  index: Map<string, ModelsDevEntry[]>,
  modelId: string | undefined,
  entry: ModelsDevEntry
): void {
  const key = modelId ? normalizeModelId(modelId) : "";
  if (!key) {
    return;
  }

  const entries = index.get(key) ?? [];
  if (entries.includes(entry)) {
    return;
  }

  index.set(key, [...entries, entry]);
}

function resolveModelsDevEntry(
  index: Map<string, ModelsDevEntry[]>,
  modelId: string
): ModelsDevEntry | undefined {
  return index.get(normalizeModelId(modelId))?.[0];
}

function toModelMetadataResolution(
  requestedModelId: string,
  entry: ModelsDevEntry
): ModelMetadataResolution {
  const model = entry.model;
  return {
    capabilities: modelCapabilitiesFromMetadata({
      modelId: requestedModelId,
      inputModalities: model.modalities?.input,
      outputModalities: model.modalities?.output,
      supportsTools: model.tool_call,
      supportsStructuredOutput: model.structured_output,
      supportsReasoning: model.reasoning,
      contextWindow: model.limit?.context
    }),
    contextWindow: positiveInteger(model.limit?.context),
    maxOutputTokens: positiveInteger(model.limit?.output),
    raw: compactModelsDevMetadata(entry),
    source: "models.dev",
    confidence: "exact",
    matchedModelId: `${entry.providerKey}/${entry.modelKey}`
  };
}

function compactModelsDevMetadata(entry: ModelsDevEntry): Record<string, unknown> {
  const model = entry.model;
  return {
    provider: entry.providerKey,
    id: model.id ?? entry.modelKey,
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

function normalizeModelId(modelId: string): string {
  return modelId.trim().toLowerCase();
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}
