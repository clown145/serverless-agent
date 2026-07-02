import { createId } from "../../shared/ids";
import { bytesToBase64 } from "../../security/base64";
import { nowIso } from "../../shared/time";
import type { InternalMessage, MessageAttachment } from "../../shared/types/internal-message";
import { createEmailSnippet } from "./mime";
import type { NormalizedEmail } from "./types";

export function normalizeEmailToInternalMessage(input: {
  agentId: string;
  integrationId: string;
  email: NormalizedEmail;
  receivedAt?: string;
}): InternalMessage {
  const receivedAt = input.receivedAt ?? nowIso();
  const conversationId = `email:${input.integrationId}:${input.email.threadKey}`;
  const subject = input.email.subject ? `Subject: ${input.email.subject}` : "Subject: (none)";
  const from = formatAddressLine("From", [input.email.from]);
  const to = formatAddressLine("To", input.email.to);
  const cc = input.email.cc.length ? formatAddressLine("Cc", input.email.cc) : undefined;
  const body = input.email.text || createEmailSnippet({ html: input.email.html }) || "(no text body)";
  const attachmentLine = input.email.attachments.length
    ? `Attachments: ${input.email.attachments
        .map((attachment) => attachment.fileName ?? attachment.id)
        .join(", ")}`
    : undefined;

  return {
    id: createId("msg"),
    platform: "email",
    platformMessageId: input.email.rfcMessageId,
    agentId: input.agentId,
    conversationId,
    sender: {
      platformUserId: input.email.from.address,
      displayName: input.email.from.name,
      role: "member"
    },
    kind: input.email.attachments.length ? "attachment" : "text",
    text: [subject, from, to, cc, "", body, attachmentLine].filter(Boolean).join("\n"),
    attachments: input.email.attachments.map<MessageAttachment>((attachment) => ({
      id: attachment.id,
      type: attachmentType(attachment.mimeType),
      name: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      dataBase64: bytesToBase64(attachment.bytes)
    })),
    rawRef: `email:${input.integrationId}:${input.email.rfcMessageId}`,
    receivedAt
  };
}

function formatAddressLine(label: string, addresses: Array<{ address: string; name?: string }>): string {
  return `${label}: ${addresses
    .map((item) => (item.name ? `${item.name} <${item.address}>` : item.address))
    .join(", ")}`;
}

function attachmentType(mimeType: string | undefined): MessageAttachment["type"] {
  if (!mimeType) {
    return "file";
  }
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "file";
}
