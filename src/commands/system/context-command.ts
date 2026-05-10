import { compactConversationNow } from "../../context/context-loader";
import { conversationSessionSuffix } from "../../conversations/ids";
import {
  getConversationSettings,
  updateConversationSettings
} from "../../storage/repositories/conversation-settings-repository";
import { listModelCatalog } from "../../storage/repositories/model-catalog-repository";
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
          responseText: `用法：${code("/context history 16", message.platform)}`
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
        responseText: `历史窗口已设置为 ${settings?.historyLimit ?? value} 条。`
      };
    }

    if (action === "summary") {
      const enabled = command.args[1]?.toLowerCase();
      if (enabled !== "on" && enabled !== "off") {
        return {
          handled: true,
          responseText: `用法：${code("/context summary on", message.platform)} 或 ${code("/context summary off", message.platform)}`
        };
      }

      await updateConversationSettings(env.AGENT_DB, message.agentId, message.conversationId, {
        summaryEnabled: enabled === "on"
      });
      return { handled: true, responseText: `自动压缩已${enabled === "on" ? "开启" : "关闭"}。` };
    }

    if (action === "summary-model") {
      const modelName = command.args.slice(1).join(" ").trim();
      if (!modelName || modelName === "default") {
        await updateConversationSettings(env.AGENT_DB, message.agentId, message.conversationId, {
          summaryProviderId: null,
          summaryModelId: null
        });
        return { handled: true, responseText: "摘要模型已恢复默认。" };
      }

      const match = await findModel(env.AGENT_DB, modelName);
      if (!match) {
        return {
          handled: true,
          responseText: `没有找到摘要模型：${code(modelName, message.platform)}`
        };
      }

      await updateConversationSettings(env.AGENT_DB, message.agentId, message.conversationId, {
        summaryProviderId: match.providerId,
        summaryModelId: match.modelId
      });
      return {
        handled: true,
        responseText: `摘要模型已设置为 ${match.providerName} / ${code(match.modelId, message.platform)}。`
      };
    }

    if (action === "compact") {
      const summary = await compactConversationNow(env, message);
      return {
        handled: true,
        responseText: summary ? "已压缩当前会话上下文。" : "当前会话历史还不需要压缩。"
      };
    }

    return {
      handled: true,
      responseText: [
        "可用 context 指令：",
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
    bold("当前上下文", message.platform),
    `会话：${code(conversationSessionSuffix(message.conversationId), message.platform)}`,
    `历史窗口：${settings?.historyLimit ?? 16} 条`,
    `自动压缩：${settings?.summaryEnabled === false ? "关闭" : "开启"}`,
    `摘要模型：${settings?.summaryModelId ?? "默认"}`,
    `已有摘要：${settings?.summaryText ? "是" : "否"}`
  ].join("\n");
}

async function findModel(
  db: D1Database,
  modelName: string
): Promise<{ providerId: string; providerName: string; modelId: string } | undefined> {
  const [models, providers] = await Promise.all([
    listModelCatalog(db),
    listModelProviders(db)
  ]);
  const model = models.find(
    (item) => item.modelId === modelName || item.displayName === modelName
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
