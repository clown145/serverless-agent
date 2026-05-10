import { getConversationBinding } from "../storage/repositories/conversation-bindings-repository";
import { ensureConversationSettings } from "../storage/repositories/conversation-settings-repository";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { rootIdForMessage } from "./ids";

export type ResolvedConversation = {
  message: InternalMessage;
  rootConversationId: string;
};

export async function resolveInboundConversation(
  env: Env,
  message: InternalMessage
): Promise<ResolvedConversation> {
  const rootConversationId = rootIdForMessage(message);
  const binding = shouldUseConversationBinding(message)
    ? await getConversationBinding(env.AGENT_DB, {
        agentId: message.agentId,
        platform: message.platform,
        rootConversationId,
        senderId: message.sender.platformUserId
      })
    : undefined;

  const conversationId = binding?.activeConversationId ?? rootConversationId;
  const resolvedMessage = { ...message, conversationId };

  await ensureConversationSettings(env.AGENT_DB, {
    agentId: message.agentId,
    conversationId,
    platform: message.platform,
    rootConversationId
  });

  return { message: resolvedMessage, rootConversationId };
}

function shouldUseConversationBinding(message: InternalMessage): boolean {
  return message.platform !== "webui" && message.platform !== "admin";
}
