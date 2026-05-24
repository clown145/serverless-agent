import {
  getConversationSettings,
  updateConversationSettings
} from "../../storage/repositories/conversation-settings-repository";
import { getModelSettings } from "../../storage/repositories/agent-model-settings-repository";
import { listEnabledModelCatalog } from "../../storage/repositories/model-catalog-repository";
import { listModelProviders } from "../../storage/repositories/model-providers-repository";
import type { CommandDefinition } from "../types";
import { bold, code } from "./format";

export const modelCommand: CommandDefinition = {
  name: "model",
  title: "Model",
  description: "Show or set the model for the current conversation.",
  async execute({ env, message, command }) {
    const action = command.args[0]?.toLowerCase();
    if (!action) {
      return {
        handled: true,
        responseText: await showModel(env.AGENT_DB, message)
      };
    }

    if (action === "clear" || action === "default") {
      await updateConversationSettings(env.AGENT_DB, message.agentId, message.conversationId, {
        modelProviderId: null,
        modelId: null
      });
      return { handled: true, responseText: "Restored the global default model." };
    }

    if (action === "use") {
      const modelName = command.args.slice(1).join(" ").trim();
      if (!modelName) {
        return {
          handled: true,
          responseText: `Usage: ${code("/model use <model-id>", message.platform)}`
        };
      }

      const match = await findModel(env.AGENT_DB, modelName);
      if (!match) {
        return {
          handled: true,
          responseText: `Enabled model not found: ${code(modelName, message.platform)}. Refresh and enable models in the WebUI model page first.`
        };
      }

      await updateConversationSettings(env.AGENT_DB, message.agentId, message.conversationId, {
        modelProviderId: match.providerId,
        modelId: match.modelId
      });

      return {
        handled: true,
        responseText: [
          bold("Conversation Model Set", message.platform),
          `${match.providerName} / ${code(match.modelId, message.platform)}`
        ].join("\n")
      };
    }

    if (action === "list") {
      const models = await listEnabledModelCatalog(env.AGENT_DB);
      if (!models.length) {
        return {
          handled: true,
          responseText:
            "No enabled models found. Refresh models in the WebUI model page and enable the models you want to use."
        };
      }

      const lines = [
        bold("Available Models", message.platform),
        ...models
          .slice(0, 20)
          .map((model) =>
            `${code(modelKey(model.providerId, model.modelId), message.platform)} ${model.displayName ? `- ${model.displayName}` : ""}`.trim()
          )
      ];
      return { handled: true, responseText: lines.join("\n") };
    }

    return {
      handled: true,
      responseText: `Unknown model command. Available: ${code("/model", message.platform)}, ${code("/model list", message.platform)}, ${code("/model use <model-id>", message.platform)}, ${code("/model clear", message.platform)}`
    };
  }
};

async function showModel(
  db: D1Database,
  message: { agentId: string; conversationId: string; platform: Parameters<typeof code>[1] }
): Promise<string> {
  const [settings, globalSettings, providers] = await Promise.all([
    getConversationSettings(db, message.agentId, message.conversationId),
    getModelSettings(db, message.agentId),
    listModelProviders(db)
  ]);
  const providerId = settings?.modelProviderId ?? globalSettings?.providerId;
  const modelId = settings?.modelId ?? globalSettings?.modelId;
  const provider = providers.find((item) => item.id === providerId);
  const source =
    settings?.modelProviderId && settings.modelId ? "current conversation" : "global default";

  return [
    bold("Current Model", message.platform),
    `Source: ${source}`,
    `Model: ${provider?.name ?? providerId ?? "mock"} / ${code(modelId ?? "mock", message.platform)}`
  ].join("\n");
}

async function findModel(
  db: D1Database,
  modelName: string
): Promise<{ providerId: string; providerName: string; modelId: string } | undefined> {
  const [models, providers] = await Promise.all([
    listEnabledModelCatalog(db),
    listModelProviders(db)
  ]);
  const matches = models.filter(
    (model) =>
      model.modelId === modelName ||
      model.displayName === modelName ||
      modelKey(model.providerId, model.modelId) === modelName
  );
  const model = matches[0];
  if (!model) {
    return undefined;
  }
  const provider = providers.find((item) => item.id === model.providerId);
  return {
    providerId: model.providerId,
    providerName: provider?.name ?? model.providerId,
    modelId: model.modelId
  };
}

function modelKey(providerId: string, modelId: string): string {
  return `${providerId}::${modelId}`;
}
