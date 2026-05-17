import type { Env } from "../../shared/types/env";
import { getModelRoleSetting } from "../../storage/repositories/agent-model-role-settings-repository";
import { getModelSettings } from "../../storage/repositories/agent-model-settings-repository";
import { getConversationSettings } from "../../storage/repositories/conversation-settings-repository";
import { listEnabledModelCatalog } from "../../storage/repositories/model-catalog-repository";
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

export type RoleModelCapabilities = Omit<ActiveModelCapabilities, "source"> & {
  source: "role";
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
    const capabilities = await resolveCatalogCapabilities(env, {
      providerId: options.providerId,
      modelId: options.modelId,
      source: "agent"
    });
    if (capabilities) {
      return capabilities;
    }
  }

  const conversation = conversationId
    ? await getConversationSettings(env.AGENT_DB, agentId, conversationId)
    : undefined;
  if (conversation?.modelProviderId && conversation.modelId) {
    const capabilities = await resolveCatalogCapabilities(env, {
      providerId: conversation.modelProviderId,
      modelId: conversation.modelId,
      source: "conversation"
    });
    if (capabilities) {
      return capabilities;
    }
  }

  const settings = await getModelSettings(env.AGENT_DB, agentId);
  if (settings?.providerId && settings.modelId) {
    const capabilities = await resolveCatalogCapabilities(env, {
      providerId: settings.providerId,
      modelId: settings.modelId,
      source: "agent"
    });
    if (capabilities) {
      return capabilities;
    }
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

export async function resolveRoleModelCapabilities(
  env: Env,
  agentId: string,
  role: "summary" | "vision"
): Promise<RoleModelCapabilities | undefined> {
  const setting = await getModelRoleSetting(env.AGENT_DB, agentId, role);
  if (!setting?.providerId || !setting.modelId) {
    return undefined;
  }

  const capabilities = await resolveCatalogCapabilities(env, {
    providerId: setting.providerId,
    modelId: setting.modelId,
    source: "agent"
  });

  return capabilities
    ? { ...capabilities, source: "role" }
    : undefined;
}

async function resolveCatalogCapabilities(
  env: Env,
  input: {
    providerId: string;
    modelId: string;
    source: "conversation" | "agent";
  }
): Promise<ActiveModelCapabilities | undefined> {
  const catalog = await listEnabledModelCatalog(env.AGENT_DB, input.providerId);
  const model = catalog.find((item) => item.modelId === input.modelId);
  if (!model) {
    throw new Error(`Selected model is not enabled: ${input.providerId} / ${input.modelId}`);
  }

  return {
    providerId: input.providerId,
    modelId: input.modelId,
    capabilities: model.capabilities,
    source: input.source
  };
}
