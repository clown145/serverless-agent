import { buildAttachmentObjectKey } from "../../../media/object-keys";
import type { InboundMediaRejection, InboundMediaResult } from "../../../media/inbound-media-types";
import type { Env } from "../../../shared/types/env";
import type { InternalMessage, MessageAttachment } from "../../../shared/types/internal-message";
import { createBlobStorage } from "../../../storage/blob";
import { D1_LITE_OBJECT_LIMIT_BYTES } from "../../../storage/blob/d1-lite-storage";
import type { BlobStorageBackend } from "../../../storage/blob/types";

export const MAX_QQ_OFFICIAL_IMAGE_BYTES = 8 * 1024 * 1024;

export async function persistQqOfficialInboundMedia(
  env: Env,
  message: InternalMessage
): Promise<InboundMediaResult> {
  if (!message.attachments.some(isQqOfficialHttpImageAttachment)) {
    return { message };
  }

  const attachmentResults: QqOfficialInboundAttachmentResult[] = await Promise.all(
    message.attachments.map(async (attachment): Promise<QqOfficialInboundAttachmentResult> => {
      if (isQqOfficialHttpImageAttachment(attachment)) {
        return persistQqOfficialImageAttachment(env, message, attachment);
      }
      return { attachment };
    })
  );
  const attachments = attachmentResults.map((result) => result.attachment);
  const rejectedAttachmentIds = attachmentResults
    .map((result) => result.rejection?.attachmentIds ?? [])
    .flat();

  return {
    message: { ...message, attachments },
    rejection: rejectedAttachmentIds.length
      ? qqOfficialImageTooLargeRejection(rejectedAttachmentIds, effectiveImageLimitBytes(env))
      : undefined
  };
}

async function persistQqOfficialImageAttachment(
  env: Env,
  message: InternalMessage,
  attachment: MessageAttachment
): Promise<QqOfficialInboundAttachmentResult> {
  const sourceUrl = attachment.sourceUrl;
  if (!sourceUrl) {
    return { attachment };
  }

  try {
    const limitBytes = effectiveImageLimitBytes(env);
    const downloaded = await downloadQqOfficialImage(sourceUrl, limitBytes);
    if (!downloaded.ok) {
      return {
        attachment,
        rejection: qqOfficialImageTooLargeRejection([attachment.id], limitBytes)
      };
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

    const persisted = {
      ...attachment,
      r2Key,
      mimeType: contentType,
      size: attachment.size ?? downloaded.bytes.byteLength
    };
    return { attachment: persisted };
  } catch (error) {
    console.error("Failed to persist QQ official inbound image:", error);
    return { attachment };
  }
}

async function downloadQqOfficialImage(
  sourceUrl: string,
  limitBytes: number
): Promise<
  { ok: true; bytes: Uint8Array; contentType?: string } | { ok: false; reason: "too_large" }
> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`QQ official image download failed ${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > limitBytes) {
    return { ok: false, reason: "too_large" };
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > limitBytes) {
    return { ok: false, reason: "too_large" };
  }

  return {
    ok: true,
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

type QqOfficialInboundAttachmentResult = {
  attachment: MessageAttachment;
  rejection?: InboundMediaRejection;
};

function effectiveImageLimitBytes(env: Env): number {
  return imageLimitBytesForBackend(effectiveBlobStorageBackend(env));
}

function effectiveBlobStorageBackend(env: Env): BlobStorageBackend {
  if (
    env.OBJECT_STORAGE_BACKEND === "d1_lite" ||
    (env.OBJECT_STORAGE_BACKEND !== "s3" && !env.AGENT_BUCKET)
  ) {
    return "d1_lite";
  }
  return env.OBJECT_STORAGE_BACKEND === "s3" ? "s3" : "r2";
}

function imageLimitBytesForBackend(backend: BlobStorageBackend): number {
  return backend === "d1_lite"
    ? Math.min(MAX_QQ_OFFICIAL_IMAGE_BYTES, D1_LITE_OBJECT_LIMIT_BYTES)
    : MAX_QQ_OFFICIAL_IMAGE_BYTES;
}

function qqOfficialImageTooLargeRejection(
  attachmentIds: string[],
  limitBytes: number
): InboundMediaRejection {
  const size = formatByteLimit(limitBytes);
  return {
    code: "attachment_too_large",
    attachmentIds,
    responseText: `The image exceeds the ${size} size limit.`,
    summary: `Inbound image exceeds the ${size} size limit`
  };
}

function formatByteLimit(bytes: number): string {
  if (bytes % (1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024)} MiB`;
  }
  if (bytes % 1024 === 0) {
    return `${bytes / 1024} KiB`;
  }
  return `${bytes} bytes`;
}
