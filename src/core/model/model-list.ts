import type { Env } from "../../shared/types/env";
import type { ModelProviderRecord } from "../../storage/repositories/model-settings-types";
import { defaultSecretName } from "./provider-config";

export type RemoteModel = {
  modelId: string;
  displayName?: string;
};

type OpenAiModelList = {
  data?: Array<{
    id?: string;
  }>;
};

type GeminiModelList = {
  models?: Array<{
    name?: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
  }>;
};

type GeminiModel = NonNullable<GeminiModelList["models"]>[number];

export async function fetchProviderModels(
  env: Env,
  provider: ModelProviderRecord
): Promise<RemoteModel[]> {
  if (provider.providerType === "openai") {
    return fetchOpenAiModels(env, provider);
  }

  if (provider.providerType === "gemini") {
    return fetchGeminiModels(env, provider);
  }

  return [{ modelId: "mock", displayName: "Mock" }];
}

function providerApiKey(env: Env, provider: ModelProviderRecord): string {
  const secretName = provider.apiKeySecret || defaultSecretName(provider.providerType);
  const value = (env as unknown as Record<string, string | undefined>)[secretName];
  if (!value && provider.providerType !== "mock") {
    throw new Error(`Missing provider secret: ${secretName}`);
  }

  return value ?? "";
}

async function fetchOpenAiModels(
  env: Env,
  provider: ModelProviderRecord
): Promise<RemoteModel[]> {
  const baseUrl = provider.baseUrl ?? "https://api.openai.com/v1";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: {
      authorization: `Bearer ${providerApiKey(env, provider)}`
    }
  });
  const payload = (await response.json().catch(() => undefined)) as
    | OpenAiModelList
    | { error?: { message?: string } }
    | undefined;

  if (!response.ok) {
    const message =
      payload && "error" in payload
        ? payload.error?.message
        : `OpenAI-compatible model list failed ${response.status}`;
    throw new Error(message ?? `OpenAI-compatible model list failed ${response.status}`);
  }

  return extractOpenAiModels(payload)
    .map((model: { id?: string }) => model.id)
    .filter((id: string | undefined): id is string => Boolean(id))
    .map((id) => ({ modelId: id, displayName: id }));
}

async function fetchGeminiModels(
  env: Env,
  provider: ModelProviderRecord
): Promise<RemoteModel[]> {
  const baseUrl = provider.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: {
      "x-goog-api-key": providerApiKey(env, provider)
    }
  });
  const payload = (await response.json().catch(() => undefined)) as
    | GeminiModelList
    | { error?: { message?: string } }
    | undefined;

  if (!response.ok) {
    const message =
      payload && "error" in payload
        ? payload.error?.message
        : `Gemini model list failed ${response.status}`;
    throw new Error(message ?? `Gemini model list failed ${response.status}`);
  }

  return extractGeminiModels(payload)
    .filter((model: GeminiModel) => {
      return model.supportedGenerationMethods?.includes("generateContent") ?? true;
    })
    .map((model: GeminiModel) => {
      const modelId = model.name?.replace(/^models\//, "") ?? "";
      return { modelId, displayName: model.displayName ?? modelId };
    })
    .filter((model: RemoteModel) => Boolean(model.modelId));
}

function extractOpenAiModels(
  payload: OpenAiModelList | { error?: { message?: string } } | undefined
): Array<{ id?: string }> {
  return payload && "data" in payload ? payload.data ?? [] : [];
}

function extractGeminiModels(
  payload: GeminiModelList | { error?: { message?: string } } | undefined
): NonNullable<GeminiModelList["models"]> {
  return payload && "models" in payload ? payload.models ?? [] : [];
}
