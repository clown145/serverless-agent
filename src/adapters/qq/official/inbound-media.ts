import { buildAttachmentObjectKey } from "../../../media/object-keys";
import type { Env } from "../../../shared/types/env";
import type { InternalMessage, MessageAttachment } from "../../../shared/types/internal-message";
import { createBlobStorage } from "../../../storage/blob";

export const MAX_QQ_OFFICIAL_IMAGE_BYTES = 8 * 1024 * 1024;

export async function persistQqOfficialInboundMedia(
  env: Env,
  message: InternalMessage
): Promise<InternalMessage> {
  if (!message.attachments.some(isQqOfficialHttpImageAttachment)) {
    return message;
  }

  const attachments = await Promise.all(
    message.attachments.map((attachment) =>
      isQqOfficialHttpImageAttachment(attachment)
        ? persistQqOfficialImageAttachment(env, message, attachment)
        : attachment
    )
  );

  return { ...message, attachments };
}

async function persistQqOfficialImageAttachment(
  env: Env,
  message: InternalMessage,
  attachment: MessageAttachment
): Promise<MessageAttachment> {
  const sourceUrl = attachment.sourceUrl;
  if (!sourceUrl) {
    return attachment;
  }

  try {
    const downloaded = await downloadQqOfficialImage(sourceUrl);
    if (!downloaded) {
      return attachment;
    }

    const r2Key = buildAttachmentObjectKey({
      agentId: message.agentId,
      messageId: message.id,
      attachmentId: attachment.id
    });
    const contentType = imageContentType(attachment.mimeType, downloaded.contentType);
    await createBlobStorage(env).put(r2Key, downloaded.bytes, {
      contentType
    });

    return {
      ...attachment,
      r2Key,
      mimeType: contentType,
      size: attachment.size ?? downloaded.bytes.byteLength
    };
  } catch (error) {
    console.error("Failed to persist QQ official inbound image:", error);
    return attachment;
  }
}

async function downloadQqOfficialImage(
  sourceUrl: string
): Promise<{ bytes: Uint8Array; contentType?: string } | undefined> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`QQ official image download failed ${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_QQ_OFFICIAL_IMAGE_BYTES) {
    return undefined;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_QQ_OFFICIAL_IMAGE_BYTES) {
    return undefined;
  }

  return {
    bytes,
    contentType: normalizeContentType(response.headers.get("content-type"))
  };
}

function isQqOfficialHttpImageAttachment(attachment: MessageAttachment): boolean {
  return (
    attachment.type === "image" &&
    !attachment.r2Key &&
    (attachment.sourceUrl?.startsWith("https://") === true ||
      attachment.sourceUrl?.startsWith("http://") === true)
  );
}

function normalizeContentType(value: string | null): string | undefined {
  return value?.split(";")[0]?.trim() || undefined;
}

function imageContentType(
  attachmentMimeType: string | undefined,
  downloadedContentType: string | undefined
): string {
  return specificMimeType(attachmentMimeType) ?? downloadedContentType ?? "image/jpeg";
}

function specificMimeType(value: string | undefined): string | undefined {
  if (!value || !value.includes("/")) {
    return undefined;
  }
  return value;
}
