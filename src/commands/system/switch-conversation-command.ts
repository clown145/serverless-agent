import {
  conversationSessionSuffix,
  createLogicalConversationId
} from "../../conversations/ids";
import { setConversationBinding } from "../../storage/repositories/conversation-bindings-repository";
import {
  ensureConversationSettings,
  listConversationSettingsByRoot
} from "../../storage/repositories/conversation-settings-repository";
import type { CommandDefinition } from "../types";
import { bold, code } from "./format";

export const switchConversationCommand: CommandDefinition = {
  name: "switch",
  aliases: ["chat", "use", "sessions"],
  title: "Switch Conversation",
  description: "Switch or list logical conversations.",
  async execute({ env, message, rootConversationId, command }) {
    const target = command.args[0];
    if (!target) {
      const sessions = await listConversationSettingsByRoot(env.AGENT_DB, {
        agentId: message.agentId,
        platform: message.platform,
        rootConversationId
      });
      const lines = [
        bold("会话列表", message.platform),
        ...sessions.slice(0, 12).map((session) =>
          [
            code(conversationSessionSuffix(session.conversationId), message.platform),
            session.title ?? "",
            session.updatedAt
          ].filter(Boolean).join(" · ")
        )
      ];
      return {
        handled: true,
        responseText: lines.length > 1 ? lines.join("\n") : "暂无可切换会话。"
      };
    }

    const sessions = await listConversationSettingsByRoot(env.AGENT_DB, {
      agentId: message.agentId,
      platform: message.platform,
      rootConversationId
    });
    const conversationId = resolveTargetConversation(rootConversationId, target, sessions);
    const settings = await ensureConversationSettings(env.AGENT_DB, {
      agentId: message.agentId,
      conversationId,
      platform: message.platform,
      rootConversationId
    });

    if (message.platform !== "webui" && message.platform !== "admin") {
      await setConversationBinding(env.AGENT_DB, {
        agentId: message.agentId,
        platform: message.platform,
        rootConversationId,
        senderId: message.sender.platformUserId,
        activeConversationId: settings.conversationId
      });
    }

    const lines = [
      bold("已切换会话", message.platform),
      `会话：${code(conversationSessionSuffix(settings.conversationId), message.platform)}`
    ];
    if (message.platform === "webui" || message.platform === "admin") {
      lines.push(`在会话输入框切换到：${code(settings.conversationId, message.platform)}`);
    }

    return { handled: true, responseText: lines.join("\n") };
  }
};

function resolveTargetConversation(
  rootConversationId: string,
  target: string,
  sessions: Array<{ conversationId: string }>
): string {
  const exact = sessions.find((session) => session.conversationId === target);
  if (exact) {
    return exact.conversationId;
  }

  const suffix = sessions.find(
    (session) => conversationSessionSuffix(session.conversationId) === target
  );
  if (suffix) {
    return suffix.conversationId;
  }

  return target.includes("#") ? target : createLogicalConversationId(rootConversationId, target);
}
