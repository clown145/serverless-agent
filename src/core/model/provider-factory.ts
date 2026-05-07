import type { Env } from "../../shared/types/env";
import { GeminiProvider } from "./gemini-provider";
import { MockModelProvider } from "./mock-provider";
import { OpenAiCompatibleProvider } from "./openai-compatible-provider";
import { requiresAuthKey } from "./provider-auth";
import { resolveModelConfig } from "./provider-config";
import type { ModelProvider } from "./types";

export async function createModelProvider(
  env: Env,
  agentId: string
): Promise<ModelProvider> {
  const config = await resolveModelConfig(env, agentId);
  return createModelProviderFromConfig(config);
}

export function createModelProviderFromConfig(
  config: Awaited<ReturnType<typeof resolveModelConfig>>
): ModelProvider {
  if (requiresAuthKey(config.authType) && !config.apiKey) {
    throw new Error("Model provider API key is missing");
  }

  if (config.provider === "openai") {
    return new OpenAiCompatibleProvider({
      apiKey: config.apiKey,
      model: config.model ?? "gpt-4.1",
      baseUrl: config.baseUrl,
      auth: {
        apiKey: config.apiKey,
        authType: config.authType,
        authHeader: config.authHeader,
        authQueryParam: config.authQueryParam
      }
    });
  }

  if (config.provider === "gemini") {
    return new GeminiProvider({
      apiKey: config.apiKey,
      model: config.model ?? "gemini-2.5-flash",
      baseUrl: config.baseUrl,
      auth: {
        apiKey: config.apiKey,
        authType: config.authType,
        authHeader: config.authHeader,
        authQueryParam: config.authQueryParam
      }
    });
  }

  return new MockModelProvider();
}
