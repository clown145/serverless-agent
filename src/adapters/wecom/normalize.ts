import { createId } from "../../shared/ids";
import type { InternalMessage } from "../../shared/types/internal-message";
import { nowIso } from "../../shared/time";
import type { WecomKfSyncMessage } from "./types";

export function wecomConversationId(openKfId: string, externalUserId: string): string {
  return `wecom:kf:${openKfId}:${externalUserId}`;
}

export function normalizeWecomKfMessage(
  message: WecomKfSyncMessage,
  agentId: string
): InternalMessage | undefined {
  const openKfId = message.open_kfid;
  const externalUserId = message.external_userid;
  if (!openKfId || !externalUserId) {
    return undefined;
  }

  const text = message.msgtype === "text" ? message.text?.content?.trim() : undefined;
  if (!text) {
    return undefined;
  }

  const receivedAt = message.send_time
    ? new Date(message.send_time * 1000).toISOString()
    : nowIso();

  return {
    id: createId("msg"),
    platform: "wecom",
    platformMessageId: message.msgid ?? createId("wecom_msg"),
    agentId,
    conversationId: wecomConversationId(openKfId, externalUserId),
    sender: {
      platformUserId: externalUserId,
      role: "member"
    },
    kind: "text",
    text,
    attachments: [],
    rawRef: `wecom:kf:${message.msgid ?? "unknown"}`,
    receivedAt
  };
}
