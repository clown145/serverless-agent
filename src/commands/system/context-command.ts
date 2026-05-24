import { compactConversationNow } from "../../context/context-loader";
import { conversationSessionSuffix } from "../../conversations/ids";
import {
  getConversationSettings,
  updateConversationSettings
} from "../../storage/repositories/conversation-settings-repository";
import { listEnabledModelCatalog } from "../../storage/repositories/model-catalog-repository";
import { listModelProviders } from "../../storage/repositories/model-providers-repository";
import type { CommandDefinition } from "../types";
import { bold, code } from "./format";

export const contextCommand: CommandDefinition = {
  name: "context",
  aliases: ["ctx", "compact"],
  title: "Context",
  description: "Show or update context settings.",
  async execute({ env, message, command }) {
    const action = command.name === "compact"
      ? "compact"
      : command.args[0]?.toLowerCase();

    if (!action) {
      return {
        handled: true,
        responseText: await showContext(env.AGENT_DB, message)
      };
    }

    if (action === "history") {
      const value = Number(command.args[1]);
      if (!Number.isFinite(value)) {
        return {
          handled: true,
          responseText: `Usage: ${code("/context history 16", message.platform)}`
        };
      }

      const settings = await updateConversationSettings(
        env.AGENT_DB,
        message.agentId,
        message.conversationId,
        { historyLimit: value }
      );
      return {
        handled: true,
        responseText: `History window set to ${settings?.historyLimit ?? value} messages.`
      };
    }

    if (action === "summary") {
      const enabled = command.args[1]?.toLowerCase();
      if (enabled !== "on" && enabled !== "off") {
        return {
          handled: true,
          responseText: `Usage: ${code("/context summary on", message.platform)} or ${code("/context summary off", message.platform)}`
        };
      }

      await updateConversationSettings(env.AGENT_DB, message.agentId, message.conversationId, {
        summaryEnabled: enabled === "on"
      });
      return { handled: true, responseText: `Automatic compaction ${enabled === "on" ? "enabled" : "disabled"}.` };
    }

    if (action === "summary-model") {
      const modelName = command.args.slice(1).join(" ").trim();
      if (!modelName || modelName === "default") {
        await updateConversationSettings(env.AGENT_DB, message.agentId, message.conversationId, {
          summaryProviderId: null,
          summaryModelId: null
        });
        return { handled: true, responseText: "Summary model reset to default." };
      }

      const match = await findModel(env.AGENT_DB, modelName);
      if (!match) {
        return {
          handled: true,
          responseText: `Enabled summary model not found: ${code(modelName, message.platform)}`
        };
      }

      await updateConversationSettings(env.AGENT_DB, message.agentId, message.conversationId, {
        summaryProviderId: match.providerId,
        summaryModelId: match.modelId
      });
      return {
        handled: true,
        responseText: `Summary model set to ${match.providerName} / ${code(match.modelId, message.platform)}.`
      };
    }

    if (action === "compact") {
      const summary = await compactConversationNow(env, message);
      return {
        handled: true,
        responseText: summary ? "Current conversation context compacted." : "Current conversation history does not need compaction."
      };
    }

    return {
      handled: true,
      responseText: [
        "Available context commands:",
        code("/context", message.platform),
        code("/context history <4-80>", message.platform),
        code("/context summary on|off", message.platform),
        code("/context summary-model <model-id|default>", message.platform),
        code("/context compact", message.platform)
      ].join("\n")
    };
  }
};

async function showContext(
  db: D1Database,
  message: { agentId: string; conversationId: string; platform: Parameters<typeof code>[1] }
): Promise<string> {
  const settings = await getConversationSettings(db, message.agentId, message.conversationId);
  return [
    bold("Current Context", message.platform),
    `Conversation: ${code(conversationSessionSuffix(message.conversationId), message.platform)}`,
    `History window: ${settings?.historyLimit ?? 16} messages`,
    `Automatic compaction: ${settings?.summaryEnabled === false ? "disabled" : "enabled"}`,
    `Summary model: ${settings?.summaryModelId ?? "default"}`,
    `Existing summary: ${settings?.summaryText ? "yes" : "no"}`
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
  const model = models.find(
    (item) =>
      item.modelId === modelName ||
      item.displayName === modelName ||
      modelKey(item.providerId, item.modelId) === modelName
  );
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
