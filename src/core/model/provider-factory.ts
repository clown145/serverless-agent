import type { Env } from "../../shared/types/env";
import { GeminiProvider } from "./gemini-provider";
import { MockModelProvider } from "./mock-provider";
import { OpenAiCompatibleProvider } from "./openai-compatible-provider";
import { resolveModelConfig } from "./provider-config";
import type { ModelProvider } from "./types";

export async function createModelProvider(
  env: Env,
  agentId: string
): Promise<ModelProvider> {
  const config = await resolveModelConfig(env, agentId);

  if (config.provider === "openai") {
    if (!config.apiKey) {
      throw new Error("OPENAI_API_KEY is required when MODEL_PROVIDER=openai");
    }

    return new OpenAiCompatibleProvider({
      apiKey: config.apiKey,
      model: config.model ?? "gpt-4.1",
      baseUrl: config.baseUrl
    });
  }

  if (config.provider === "gemini") {
    if (!config.apiKey) {
      throw new Error("GEMINI_API_KEY is required when MODEL_PROVIDER=gemini");
    }

    return new GeminiProvider({
      apiKey: config.apiKey,
      model: config.model ?? "gemini-2.5-flash",
      baseUrl: config.baseUrl
    });
  }

  return new MockModelProvider();
}
