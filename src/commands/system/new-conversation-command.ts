import { createLogicalConversationId, conversationSessionSuffix } from "../../conversations/ids";
import { setConversationBinding } from "../../storage/repositories/conversation-bindings-repository";
import { ensureConversationSettings } from "../../storage/repositories/conversation-settings-repository";
import type { CommandDefinition } from "../types";
import { bold, code } from "./format";

export const newConversationCommand: CommandDefinition = {
  name: "new",
  aliases: ["newchat"],
  title: "New Conversation",
  description: "Open a new logical conversation.",
  async execute({ env, message, rootConversationId, command }) {
    const title = command.rest || "New conversation";
    const sessionId = createSessionId(title);
    const conversationId = createLogicalConversationId(rootConversationId, sessionId);

    await ensureConversationSettings(env.AGENT_DB, {
      agentId: message.agentId,
      conversationId,
      platform: message.platform,
      rootConversationId,
      title
    });

    if (message.platform !== "webui" && message.platform !== "admin") {
      await setConversationBinding(env.AGENT_DB, {
        agentId: message.agentId,
        platform: message.platform,
        rootConversationId,
        senderId: message.sender.platformUserId,
        activeConversationId: conversationId
      });
    }

    const lines = [
      bold("已开启新会话", message.platform),
      `标题：${title}`,
      `会话：${code(conversationSessionSuffix(conversationId), message.platform)}`
    ];

    if (message.platform === "webui" || message.platform === "admin") {
      lines.push(`在会话输入框切换到：${code(conversationId, message.platform)}`);
    }

    return { handled: true, responseText: lines.join("\n") };
  }
};

function createSessionId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${slug || "chat"}-${suffix}`;
}
