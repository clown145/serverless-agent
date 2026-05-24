import { getModelSettings, setModelSettings } from "../../storage/repositories/agent-model-settings-repository";
import {
  getAgentModelConfig,
  setAgentModelConfig
} from "../../storage/repositories/agent-model-config-repository";
import {
  clearModelRoleSetting,
  listModelRoleSettings,
  setModelRoleSetting
} from "../../storage/repositories/agent-model-role-settings-repository";
import { listModelCatalog } from "../../storage/repositories/model-catalog-repository";
import { listModelProviders } from "../../storage/repositories/model-providers-repository";
import type { ModelRole } from "../../storage/repositories/model-settings-types";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { toProviderDto } from "./model-settings/model-provider-dto";
import {
  toAgentModelConfigDto,
  toModelRoleSettingsDto
} from "./model-settings/model-role-settings-dto";
import {
  updateModelRoleSettingsSchema,
  zodMessage
} from "./model-settings/model-settings-schemas";

const MODEL_ROLES: ModelRole[] = ["default", "summary", "vision"];

export async function handleAdminModelRoleSettings(
  request: Request,
  env: Env
): Promise<Response> {
  const agentId = new URL(request.url).searchParams.get("agentId") ?? env.DEFAULT_AGENT_ID ?? "default";

  if (request.method === "GET") {
    const [providers, models, defaultSettings, roleSettings, config] = await Promise.all([
      listModelProviders(env.AGENT_DB),
      listModelCatalog(env.AGENT_DB),
      getModelSettings(env.AGENT_DB, agentId),
      listModelRoleSettings(env.AGENT_DB, agentId),
      getAgentModelConfig(env.AGENT_DB, agentId)
    ]);

    return jsonResponse({
      ok: true,
      providers: providers.map(toProviderDto),
      models,
      settings: defaultSettings,
      roles: toModelRoleSettingsDto(roleSettings),
      config: toAgentModelConfigDto(config)
    });
  }

  if (request.method === "PUT") {
    const parsed = updateModelRoleSettingsSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const models = await listModelCatalog(env.AGENT_DB);
    for (const role of MODEL_ROLES) {
      const selection = parsed.data.roles[role];
      if (selection === undefined) {
        continue;
      }

      if (selection === null) {
        if (role === "default") {
          continue;
        }
        await clearModelRoleSetting(env.AGENT_DB, agentId, role);
        continue;
      }

      const model = models.find(
        (item) =>
          item.providerId === selection.providerId &&
          item.modelId === selection.modelId &&
          item.status === "enabled"
      );
      if (!model) {
        return errorResponse(
          400,
          "model_not_enabled",
          `Enable the model before selecting it for ${role}`
        );
      }

      if (role === "default") {
        await setModelSettings(env.AGENT_DB, {
          agentId,
          providerId: selection.providerId,
          modelId: selection.modelId
        });
      } else {
        await setModelRoleSetting(env.AGENT_DB, {
          agentId,
          role,
          providerId: selection.providerId,
          modelId: selection.modelId
        });
      }
    }

    if (parsed.data.config?.imageCaptionEnabled !== undefined) {
      await setAgentModelConfig(env.AGENT_DB, {
        agentId,
        imageCaptionEnabled: parsed.data.config.imageCaptionEnabled
      });
    }

    const [providers, nextModels, defaultSettings, roleSettings, config] = await Promise.all([
      listModelProviders(env.AGENT_DB),
      listModelCatalog(env.AGENT_DB),
      getModelSettings(env.AGENT_DB, agentId),
      listModelRoleSettings(env.AGENT_DB, agentId),
      getAgentModelConfig(env.AGENT_DB, agentId)
    ]);

    return jsonResponse({
      ok: true,
      providers: providers.map(toProviderDto),
      models: nextModels,
      settings: defaultSettings,
      roles: toModelRoleSettingsDto(roleSettings),
      config: toAgentModelConfigDto(config)
    });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
