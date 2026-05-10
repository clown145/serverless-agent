import type { Env } from "../../shared/types/env";
import { getModelSettings } from "../../storage/repositories/agent-model-settings-repository";
import { getConversationSettings } from "../../storage/repositories/conversation-settings-repository";
import { getModelProviderRecord } from "../../storage/repositories/model-providers-repository";
import type {
  ChatProtocol,
  ModelAuthType,
  ModelProviderRecord
} from "../../storage/repositories/model-settings-types";
import { resolveProviderApiKey } from "./provider-credential";
import type { ModelProviderName } from "./types";

export type ResolvedModelConfig = {
  provider: ModelProviderName;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  authType: ModelAuthType;
  authHeader?: string;
  authQueryParam?: string;
  chatProtocol: ChatProtocol;
};

export async function resolveModelConfig(
  env: Env,
  agentId: string,
  options: {
    conversationId?: string;
    providerId?: string;
    modelId?: string;
  } = {}
): Promise<ResolvedModelConfig> {
  if (options.providerId && options.modelId) {
    const provider = await getModelProviderRecord(env.AGENT_DB, options.providerId);
    if (provider && provider.status === "active") {
      return resolveModelConfigFromProvider(env, provider, options.modelId);
    }
  }

  if (options.conversationId) {
    const conversation = await getConversationSettings(
      env.AGENT_DB,
      agentId,
      options.conversationId
    );
    if (conversation?.modelProviderId && conversation.modelId) {
      const provider = await getModelProviderRecord(env.AGENT_DB, conversation.modelProviderId);
      if (provider && provider.status === "active") {
        return resolveModelConfigFromProvider(env, provider, conversation.modelId);
      }
    }
  }

  const settings = await getModelSettings(env.AGENT_DB, agentId);
  if (settings?.providerId && settings.modelId) {
    const provider = await getModelProviderRecord(env.AGENT_DB, settings.providerId);
    if (provider && provider.status === "active") {
      return resolveModelConfigFromProvider(env, provider, settings.modelId);
    }
  }

  return resolveEnvConfig(env);
}

export async function resolveModelConfigFromProvider(
  env: Env,
  provider: ModelProviderRecord,
  model: string
): Promise<ResolvedModelConfig> {
  return {
    provider: providerNameFromRecord(provider),
    model,
    baseUrl: provider.baseUrl,
    apiKey: await resolveProviderApiKey(env, provider),
    authType: provider.authType,
    authHeader: provider.authHeader,
    authQueryParam: provider.authQueryParam,
    chatProtocol: provider.chatProtocol
  };
}

function resolveEnvConfig(env: Env): ResolvedModelConfig {
  const provider = resolveProviderName(env);

  if (provider === "openai") {
    return {
      provider,
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL ?? env.MODEL_NAME ?? "gpt-4.1",
      baseUrl: env.OPENAI_BASE_URL,
      authType: "bearer",
      chatProtocol: "openai-chat-completions"
    };
  }

  if (provider === "gemini") {
    return {
      provider,
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL ?? env.MODEL_NAME ?? "gemini-2.5-flash",
      baseUrl: env.GEMINI_BASE_URL,
      authType: "query-param",
      authQueryParam: "key",
      chatProtocol: "gemini-generate-content"
    };
  }

  return {
    provider: "mock",
    authType: "none",
    chatProtocol: "openai-chat-completions"
  };
}

export function providerNameFromRecord(provider: ModelProviderRecord): ModelProviderName {
  if (provider.providerType === "mock") {
    return "mock";
  }

  if (provider.chatProtocol === "gemini-generate-content") {
    return "gemini";
  }

  return "openai";
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
