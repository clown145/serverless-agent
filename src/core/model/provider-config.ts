import type { Env } from "../../shared/types/env";
import { getModelRoleSetting } from "../../storage/repositories/agent-model-role-settings-repository";
import { getModelSettings } from "../../storage/repositories/agent-model-settings-repository";
import { getConversationSettings } from "../../storage/repositories/conversation-settings-repository";
import { listEnabledModelCatalog } from "../../storage/repositories/model-catalog-repository";
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
  providerId?: string;
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
    role?: "default" | "summary" | "vision";
  } = {}
): Promise<ResolvedModelConfig> {
  if (options.providerId && options.modelId) {
    const config = await resolveEnabledModelConfig(
      env,
      options.providerId,
      options.modelId
    );
    if (config) {
      return config;
    }
  }

  if (options.conversationId) {
    const conversation = await getConversationSettings(
      env.AGENT_DB,
      agentId,
      options.conversationId
    );
    if (conversation?.modelProviderId && conversation.modelId) {
      const config = await resolveEnabledModelConfig(
        env,
        conversation.modelProviderId,
        conversation.modelId
      );
      if (config) {
        return config;
      }
    }
  }

  if (options.role && options.role !== "default") {
    const roleConfig = await resolveRoleModelConfig(env, agentId, options.role);
    if (roleConfig) {
      return roleConfig;
    }
  }

  const defaultConfig = await resolveDefaultModelConfig(env, agentId);
  if (defaultConfig) {
    return defaultConfig;
  }

  return resolveEnvConfig(env);
}

export async function resolveDefaultModelConfig(
  env: Env,
  agentId: string
): Promise<ResolvedModelConfig | undefined> {
  const settings = await getModelSettings(env.AGENT_DB, agentId);
  if (!settings?.providerId || !settings.modelId) {
    return undefined;
  }

  return resolveEnabledModelConfig(env, settings.providerId, settings.modelId);
}

export async function resolveRoleModelConfig(
  env: Env,
  agentId: string,
  role: "summary" | "vision"
): Promise<ResolvedModelConfig | undefined> {
  const setting = await getModelRoleSetting(env.AGENT_DB, agentId, role);
  if (!setting?.providerId || !setting.modelId) {
    return undefined;
  }

  return resolveEnabledModelConfig(env, setting.providerId, setting.modelId);
}

async function resolveEnabledModelConfig(
  env: Env,
  providerId: string,
  modelId: string
): Promise<ResolvedModelConfig | undefined> {
  const [provider, models] = await Promise.all([
    getModelProviderRecord(env.AGENT_DB, providerId),
    listEnabledModelCatalog(env.AGENT_DB, providerId)
  ]);
  const model = models.find((item) => item.modelId === modelId);
  if (!provider || provider.status !== "active") {
    return undefined;
  }

  if (!model) {
    throw new Error(`Selected model is not enabled: ${provider.name} / ${modelId}`);
  }

  return resolveModelConfigFromProvider(env, provider, model.modelId);
}

export async function resolveModelConfigFromProvider(
  env: Env,
  provider: ModelProviderRecord,
  model: string
): Promise<ResolvedModelConfig> {
  return {
    provider: providerNameFromRecord(provider),
    providerId: provider.id,
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
