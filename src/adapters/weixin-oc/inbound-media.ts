import { decryptAes128EcbPkcs7 } from "../../security/aes-ecb";
import { base64ToBytes } from "../../security/base64";
import type { Env } from "../../shared/types/env";
import type { InternalMessage, MessageAttachment } from "../../shared/types/internal-message";
import { buildAttachmentObjectKey } from "../../media/object-keys";
import type { WeixinOcBotConfig } from "./config";
import type { WeixinOcMediaRef } from "./types";

const MAX_WEIXIN_OC_IMAGE_BYTES = 8 * 1024 * 1024;

export async function persistWeixinOcInboundMedia(
  env: Env,
  config: WeixinOcBotConfig,
  message: InternalMessage
): Promise<InternalMessage> {
  if (!message.attachments.some(isWeixinOcCdnImageAttachment)) {
    return message;
  }

  const attachments = await Promise.all(
    message.attachments.map((attachment) =>
      isWeixinOcCdnImageAttachment(attachment)
        ? persistWeixinOcImageAttachment(env, config, message, attachment)
        : attachment
    )
  );

  return { ...message, attachments };
}

async function persistWeixinOcImageAttachment(
  env: Env,
  config: WeixinOcBotConfig,
  message: InternalMessage,
  attachment: MessageAttachment
): Promise<MessageAttachment> {
  const ref = parseWeixinOcCdnSource(attachment.sourceUrl);
  if (!ref) {
    return attachment;
  }

  try {
    const encryptedBytes = await downloadWeixinOcCdnBytes(config.cdnBaseUrl, ref.media);
    if (encryptedBytes.byteLength > MAX_WEIXIN_OC_IMAGE_BYTES + 16) {
      return attachment;
    }

    const bytes = decryptAes128EcbPkcs7(encryptedBytes, parseWeixinOcAesKey(ref));
    if (bytes.byteLength > MAX_WEIXIN_OC_IMAGE_BYTES) {
      return attachment;
    }

    const r2Key = buildAttachmentObjectKey({
      agentId: message.agentId,
      messageId: message.id,
      attachmentId: attachment.id
    });
    await env.AGENT_BUCKET.put(r2Key, bytes, {
      httpMetadata: {
        contentType: attachment.mimeType ?? "image/jpeg"
      }
    });

    return {
      ...attachment,
      r2Key,
      size: bytes.byteLength
    };
  } catch (error) {
    console.error("Failed to persist Weixin OC inbound image:", error);
    return attachment;
  }
}

async function downloadWeixinOcCdnBytes(
  cdnBaseUrl: string,
  media: WeixinOcMediaRef
): Promise<Uint8Array> {
  const url = media.full_url?.trim() || buildCdnDownloadUrl(cdnBaseUrl, media);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weixin OC CDN download failed ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function buildCdnDownloadUrl(cdnBaseUrl: string, media: WeixinOcMediaRef): string {
  const encryptedQueryParam = media.encrypt_query_param?.trim();
  if (!encryptedQueryParam) {
    throw new Error("Weixin OC image media is missing encrypt_query_param");
  }
  const url = new URL(`${cdnBaseUrl.replace(/\/+$/, "")}/download`);
  url.searchParams.set("encrypted_query_param", encryptedQueryParam);
  return url.toString();
}

function parseWeixinOcAesKey(input: {
  aeskey?: string;
  media: WeixinOcMediaRef;
}): Uint8Array {
  if (input.aeskey?.trim()) {
    return hexToBytes(input.aeskey.trim());
  }

  const mediaKey = input.media.aes_key?.trim();
  if (!mediaKey) {
    throw new Error("Weixin OC image media is missing aes key");
  }

  const decoded = base64ToBytes(mediaKey);
  if (decoded.byteLength === 16) {
    return decoded;
  }

  const asText = new TextDecoder().decode(decoded);
  if (decoded.byteLength === 32 && /^[0-9a-fA-F]{32}$/.test(asText)) {
    return hexToBytes(asText);
  }

  throw new Error("Invalid Weixin OC image aes key");
}

function parseWeixinOcCdnSource(
  sourceUrl: string | undefined
): { media: WeixinOcMediaRef; aeskey?: string } | undefined {
  if (!sourceUrl?.startsWith("weixin-oc:cdn:")) {
    return undefined;
  }

  const encoded = sourceUrl.slice("weixin-oc:cdn:".length);
  try {
    const parsed = JSON.parse(atob(encoded)) as {
      media?: WeixinOcMediaRef;
      aeskey?: string;
    };
    return parsed.media ? { media: parsed.media, aeskey: parsed.aeskey } : undefined;
  } catch {
    return undefined;
  }
}

function isWeixinOcCdnImageAttachment(attachment: MessageAttachment): boolean {
  return attachment.type === "image" && attachment.sourceUrl?.startsWith("weixin-oc:cdn:") === true;
}

function hexToBytes(value: string): Uint8Array {
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
