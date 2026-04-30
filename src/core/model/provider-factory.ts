import type { Env } from "../../shared/types/env";
import { GeminiProvider } from "./gemini-provider";
import { MockModelProvider } from "./mock-provider";
import { OpenAiCompatibleProvider } from "./openai-compatible-provider";
import type { ModelProvider, ModelProviderName } from "./types";

export function createModelProvider(env: Env): ModelProvider {
  const provider = resolveProviderName(env);

  if (provider === "openai") {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required when MODEL_PROVIDER=openai");
    }

    return new OpenAiCompatibleProvider({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL ?? env.MODEL_NAME ?? "gpt-4.1",
      baseUrl: env.OPENAI_BASE_URL
    });
  }

  if (provider === "gemini") {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required when MODEL_PROVIDER=gemini");
    }

    return new GeminiProvider({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL ?? env.MODEL_NAME ?? "gemini-2.5-flash",
      baseUrl: env.GEMINI_BASE_URL
    });
  }

  return new MockModelProvider();
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
