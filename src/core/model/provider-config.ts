import type { Env } from "../../shared/types/env";
import { getModelSettings } from "../../storage/repositories/agent-model-settings-repository";
import { getModelProviderRecord } from "../../storage/repositories/model-providers-repository";
import type { ModelProviderType } from "../../storage/repositories/model-settings-types";
import type { ModelProviderName } from "./types";

export type ResolvedModelConfig = {
  provider: ModelProviderName;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
};

export async function resolveModelConfig(
  env: Env,
  agentId: string
): Promise<ResolvedModelConfig> {
  const settings = await getModelSettings(env.AGENT_DB, agentId);
  if (settings?.providerId && settings.modelId) {
    const provider = await getModelProviderRecord(env.AGENT_DB, settings.providerId);
    if (provider && provider.status === "active") {
      return {
        provider: provider.providerType,
        model: settings.modelId,
        baseUrl: provider.baseUrl,
        apiKey: readProviderSecret(env, provider.apiKeySecret)
      };
    }
  }

  return resolveEnvConfig(env);
}

function resolveEnvConfig(env: Env): ResolvedModelConfig {
  const provider = resolveProviderName(env);

  if (provider === "openai") {
    return {
      provider,
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL ?? env.MODEL_NAME ?? "gpt-4.1",
      baseUrl: env.OPENAI_BASE_URL
    };
  }

  if (provider === "gemini") {
    return {
      provider,
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL ?? env.MODEL_NAME ?? "gemini-2.5-flash",
      baseUrl: env.GEMINI_BASE_URL
    };
  }

  return { provider: "mock" };
}

function resolveProviderName(env: Env): ModelProviderName {
  if (env.MODEL_PROVIDER === "openai" || env.MODEL_PROVIDER === "gemini") {
    return env.MODEL_PROVIDER;
  }

  if (env.MODEL_PROVIDER === "mock") {
    return "mock";
  }

  if (env.OPENAI_API_KEY) {
    return "openai";
  }

  if (env.GEMINI_API_KEY) {
    return "gemini";
  }

  return "mock";
}

function readProviderSecret(env: Env, name: string): string | undefined {
  const record = env as unknown as Record<string, string | undefined>;
  return record[name];
}

export function defaultSecretName(type: ModelProviderType): string {
  if (type === "openai") {
    return "OPENAI_API_KEY";
  }

  if (type === "gemini") {
    return "GEMINI_API_KEY";
  }

  return "MODEL_API_KEY";
}
