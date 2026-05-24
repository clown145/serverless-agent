import type { Env } from "../../shared/types/env";
import type { ModelProviderRecord } from "../../storage/repositories/model-settings-types";
import { applyModelAuth, requiresAuthKey, type ModelAuthConfig } from "./provider-auth";
import { resolveProviderApiKey } from "./provider-credential";
import { geminiModelsUrl, openAiModelsUrl } from "./provider-endpoints";

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
  if (provider.providerType === "mock") {
    return [{ modelId: "mock", displayName: "Mock" }];
  }

  if (provider.modelListStrategy === "openai") {
    return fetchOpenAiModels(env, provider);
  }

  if (provider.modelListStrategy === "gemini") {
    return fetchGeminiModels(env, provider);
  }

  return [];
}

async function providerAuth(env: Env, provider: ModelProviderRecord): Promise<ModelAuthConfig> {
  const apiKey = await resolveProviderApiKey(env, provider);
  if (!apiKey && requiresAuthKey(provider.authType)) {
    throw new Error("Model provider API key is missing");
  }

  return {
    apiKey,
    authType: provider.authType,
    authHeader: provider.authHeader,
    authQueryParam: provider.authQueryParam
  };
}

async function fetchOpenAiModels(env: Env, provider: ModelProviderRecord): Promise<RemoteModel[]> {
  const headers = new Headers();
  const endpoint = applyModelAuth(
    openAiModelsUrl(provider.baseUrl),
    headers,
    await providerAuth(env, provider)
  );
  const response = await fetch(endpoint, { headers });
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

async function fetchGeminiModels(env: Env, provider: ModelProviderRecord): Promise<RemoteModel[]> {
  const headers = new Headers();
  const endpoint = applyModelAuth(
    geminiModelsUrl(provider.baseUrl),
    headers,
    await providerAuth(env, provider)
  );
  const response = await fetch(endpoint, { headers });
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
  return payload && "data" in payload ? (payload.data ?? []) : [];
}

function extractGeminiModels(
  payload: GeminiModelList | { error?: { message?: string } } | undefined
): NonNullable<GeminiModelList["models"]> {
  return payload && "models" in payload ? (payload.models ?? []) : [];
}
