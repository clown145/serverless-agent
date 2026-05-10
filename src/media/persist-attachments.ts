import { base64ToBytes } from "../security/base64";
import type { Env } from "../shared/types/env";
import type { InternalMessage, MessageAttachment } from "../shared/types/internal-message";
import { buildAttachmentObjectKey } from "./object-keys";
import { resolveTelegramBotForAgent } from "../adapters/telegram/config";
import { getTelegramFileDownload } from "../adapters/telegram/file";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export async function persistInboundAttachments(
  env: Env,
  message: InternalMessage
): Promise<InternalMessage> {
  if (!message.attachments.length) {
    return message;
  }

  const attachments: MessageAttachment[] = [];
  for (const attachment of message.attachments) {
    attachments.push(await persistAttachment(env, message, attachment));
  }

  return { ...message, attachments };
}

async function persistAttachment(
  env: Env,
  message: InternalMessage,
  attachment: MessageAttachment
): Promise<MessageAttachment> {
  if (attachment.r2Key) {
    return withoutInlineData(attachment);
  }

  if (attachment.dataBase64) {
    const bytes = base64ToBytes(stripDataUrlPrefix(attachment.dataBase64));
    if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      return withoutInlineData(attachment);
    }
    const r2Key = await putBytes(env, message, attachment, bytes);
    return withoutInlineData({ ...attachment, r2Key, size: bytes.byteLength });
  }

  if (attachment.sourceUrl?.startsWith("telegram:file:")) {
    const fileId = attachment.sourceUrl.replace("telegram:file:", "");
    const bot = await resolveTelegramBotForAgent(env, message.agentId);
    if (!bot.token) {
      return attachment;
    }

    const file = await getTelegramFileDownload(bot.token, fileId);
    if (file.bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      return attachment;
    }

    const r2Key = await putBytes(env, message, attachment, file.bytes, file.mimeType);
    return {
      ...withoutInlineData(attachment),
      r2Key,
      mimeType: attachment.mimeType ?? file.mimeType,
      size: attachment.size ?? file.bytes.byteLength
    };
  }

  return withoutInlineData(attachment);
}

async function putBytes(
  env: Env,
  message: InternalMessage,
  attachment: MessageAttachment,
  bytes: Uint8Array,
  detectedMimeType?: string
): Promise<string> {
  const key = buildAttachmentObjectKey({
    agentId: message.agentId,
    messageId: message.id,
    attachmentId: attachment.id
  });
  const mimeType = attachment.mimeType ?? detectedMimeType ?? "application/octet-stream";

  await env.AGENT_BUCKET.put(key, bytes, {
    httpMetadata: { contentType: mimeType }
  });

  return key;
}

function stripDataUrlPrefix(value: string): string {
  return value.replace(/^data:[^;]+;base64,/, "");
}

function withoutInlineData(attachment: MessageAttachment): MessageAttachment {
  const { dataBase64: _dataBase64, ...rest } = attachment;
  return rest;
}
