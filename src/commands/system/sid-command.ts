import { conversationSessionSuffix } from "../../conversations/ids";
import type { CommandDefinition } from "../types";
import { bold, code } from "./format";

export const sidCommand: CommandDefinition = {
  name: "sid",
  aliases: ["id", "ids", "whoami"],
  title: "Session ID",
  description: "Show IDs for this session and permission configuration.",
  async execute({ message, rootConversationId }) {
    const rootId = rootConversationId || message.conversationId.split("#")[0] || message.conversationId;
    const lines = [
      bold("当前会话 ID", message.platform),
      `agentId: ${code(message.agentId, message.platform)}`,
      `platform: ${code(message.platform, message.platform)}`,
      `conversationId: ${code(message.conversationId, message.platform)}`,
      `rootConversationId: ${code(rootId, message.platform)}`,
      `session: ${code(conversationSessionSuffix(message.conversationId), message.platform)}`,
      `senderId: ${code(message.sender.platformUserId, message.platform)}`,
      `senderRole: ${code(message.sender.role, message.platform)}`,
      `platformMessageId: ${code(message.platformMessageId, message.platform)}`,
      "",
      bold("权限配置可用 subject", message.platform),
      `agent / ${code(message.agentId, message.platform)}`,
      `user / ${code(message.sender.platformUserId, message.platform)}`,
      `role / ${code(message.sender.role, message.platform)}`,
      `platform / ${code(message.platform, message.platform)}`,
      `conversation / ${code(message.conversationId, message.platform)}`,
      `conversation / ${code(rootId, message.platform)}`
    ];

    return {
      handled: true,
      responseText: lines.join("\n")
    };
  }
};
