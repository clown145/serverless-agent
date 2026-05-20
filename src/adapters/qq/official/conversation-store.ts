import type { QqOfficialConversationBinding } from "./normalize";
import type { QqOfficialSendTarget } from "./types";

const KEY_PREFIX = "qq_conversation:";

export type StoredQqOfficialConversation = QqOfficialConversationBinding & {
  updatedAt: string;
};

export async function rememberQqOfficialConversation(
  storage: DurableObjectStorage,
  binding: QqOfficialConversationBinding
): Promise<void> {
  await storage.put(conversationKey(binding.conversationId), {
    ...binding,
    updatedAt: new Date().toISOString()
  } satisfies StoredQqOfficialConversation);
}

export async function getQqOfficialConversation(
  storage: DurableObjectStorage,
  conversationId: string
): Promise<StoredQqOfficialConversation | undefined> {
  return storage.get<StoredQqOfficialConversation>(conversationKey(conversationId));
}

export function targetFromStoredConversation(
  binding: StoredQqOfficialConversation
): QqOfficialSendTarget {
  if (binding.targetKind === "group") {
    return { kind: "group", groupOpenId: binding.targetId };
  }
  if (binding.targetKind === "c2c") {
    return { kind: "c2c", openId: binding.targetId };
  }
  if (binding.targetKind === "direct") {
    return { kind: "direct", guildId: binding.targetId };
  }
  return { kind: "channel", channelId: binding.targetId };
}

function conversationKey(conversationId: string): string {
  return `${KEY_PREFIX}${conversationId}`;
}
