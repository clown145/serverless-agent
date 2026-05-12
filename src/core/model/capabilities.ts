import type { Env } from "../../shared/types/env";
import { getModelSettings } from "../../storage/repositories/agent-model-settings-repository";
import { getConversationSettings } from "../../storage/repositories/conversation-settings-repository";
import { listModelCatalog } from "../../storage/repositories/model-catalog-repository";
import {
  inferModelCapabilities,
  type ModelCapability
} from "./capability-defaults";

export type ActiveModelCapabilities = {
  providerId?: string;
  modelId: string;
  capabilities: ModelCapability[];
  source: "conversation" | "agent" | "env" | "mock";
};

export async function resolveActiveModelCapabilities(
  env: Env,
  agentId: string,
  conversationId?: string,
  options: {
    providerId?: string;
    modelId?: string;
  } = {}
): Promise<ActiveModelCapabilities> {
  if (options.providerId && options.modelId) {
    return resolveCatalogCapabilities(env, {
      providerId: options.providerId,
      modelId: options.modelId,
      source: "agent"
    });
  }

  const conversation = conversationId
    ? await getConversationSettings(env.AGENT_DB, agentId, conversationId)
    : undefined;
  if (conversation?.modelProviderId && conversation.modelId) {
    return resolveCatalogCapabilities(env, {
      providerId: conversation.modelProviderId,
      modelId: conversation.modelId,
      source: "conversation"
    });
  }

  const settings = await getModelSettings(env.AGENT_DB, agentId);
  if (settings?.providerId && settings.modelId) {
    return resolveCatalogCapabilities(env, {
      providerId: settings.providerId,
      modelId: settings.modelId,
      source: "agent"
    });
  }

  const modelId =
    env.OPENAI_MODEL ??
    env.GEMINI_MODEL ??
    env.MODEL_NAME ??
    (env.MODEL_PROVIDER === "mock" ? "mock" : "gpt-4.1");

  return {
    modelId,
    capabilities: modelId === "mock" ? ["tools"] : inferModelCapabilities(modelId),
    source: env.MODEL_PROVIDER === "mock" ? "mock" : "env"
  };
}

function hasCapability(capabilities: ModelCapability[], capability: ModelCapability): boolean {
  return capabilities.includes(capability);
}

export function supportsVision(capabilities: ModelCapability[]): boolean {
  return hasCapability(capabilities, "vision");
}

async function resolveCatalogCapabilities(
  env: Env,
  input: {
    providerId: string;
    modelId: string;
    source: "conversation" | "agent";
  }
): Promise<ActiveModelCapabilities> {
  const catalog = await listModelCatalog(env.AGENT_DB, input.providerId);
  const model = catalog.find((item) => item.modelId === input.modelId);

  return {
    providerId: input.providerId,
    modelId: input.modelId,
    capabilities: model?.capabilities ?? inferModelCapabilities(input.modelId),
    source: input.source
  };
}
