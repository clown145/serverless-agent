import type { OutboundFile } from "../../platforms/outbound/types";
import { aes128EcbPaddedSize, encryptAes128EcbPkcs7 } from "../../security/aes-ecb";
import { bytesToBase64, bytesToHex } from "../../security/base64";
import { md5Hex } from "../../security/md5";
import { WeixinOcApiClient } from "./api";
import type {
  WeixinOcFileItem,
  WeixinOcImageItem,
  WeixinOcMediaUploadKind,
  WeixinOcUploadedMedia
} from "./types";

const MEDIA_TYPE = {
  image: 1,
  video: 2,
  file: 3,
  voice: 4
} as const;

const UPLOAD_MAX_RETRIES = 3;

export async function uploadWeixinOcMedia(input: {
  client: WeixinOcApiClient;
  cdnBaseUrl: string;
  toUserId: string;
  file: OutboundFile;
  kind: WeixinOcMediaUploadKind;
}): Promise<WeixinOcUploadedMedia> {
  const aesKey = randomBytes(16);
  const aesKeyHex = bytesToHex(aesKey);
  const fileKey = randomBytesHex(16);
  const rawSize = input.file.bytes.length;
  const ciphertextSize = aes128EcbPaddedSize(rawSize);

  const uploadUrl = await input.client.getUploadUrl({
    filekey: fileKey,
    media_type: MEDIA_TYPE[input.kind],
    to_user_id: input.toUserId,
    rawsize: rawSize,
    rawfilemd5: md5Hex(input.file.bytes),
    filesize: ciphertextSize,
    no_need_thumb: true,
    aeskey: aesKeyHex
  });

  const downloadEncryptedQueryParam = await uploadBufferToWeixinOcCdn({
    bytes: input.file.bytes,
    aesKey,
    uploadFullUrl: uploadUrl.upload_full_url,
    uploadParam: uploadUrl.upload_param,
    cdnBaseUrl: input.cdnBaseUrl,
    fileKey
  });

  return {
    filekey: fileKey,
    downloadEncryptedQueryParam,
    aesKeyHex,
    aesKeyTransportBase64: bytesToBase64(new TextEncoder().encode(aesKeyHex)),
    plainSize: rawSize,
    ciphertextSize
  };
}

export function buildWeixinOcImageItem(
  uploaded: WeixinOcUploadedMedia
): WeixinOcImageItem {
  return {
    type: 2,
    image_item: {
      media: {
        encrypt_query_param: uploaded.downloadEncryptedQueryParam,
        aes_key: uploaded.aesKeyTransportBase64,
        encrypt_type: 1
      },
      aeskey: uploaded.aesKeyHex,
      mid_size: uploaded.ciphertextSize
    }
  };
}

export function buildWeixinOcFileItem(input: {
  uploaded: WeixinOcUploadedMedia;
  fileName: string;
}): WeixinOcFileItem {
  return {
    type: 4,
    file_item: {
      media: {
        encrypt_query_param: input.uploaded.downloadEncryptedQueryParam,
        aes_key: input.uploaded.aesKeyTransportBase64,
        encrypt_type: 1
      },
      file_name: input.fileName,
      len: String(input.uploaded.plainSize)
    }
  };
}

async function uploadBufferToWeixinOcCdn(input: {
  bytes: Uint8Array;
  aesKey: Uint8Array;
  uploadFullUrl?: string;
  uploadParam?: string;
  cdnBaseUrl: string;
  fileKey: string;
}): Promise<string> {
  const url = input.uploadFullUrl?.trim() || buildCdnUploadUrl(input);
  const ciphertext = encryptAes128EcbPkcs7(input.bytes, input.aesKey);
  let lastError: unknown;

  for (let attempt = 1; attempt <= UPLOAD_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: ciphertext
      });

      if (response.status >= 400 && response.status < 500) {
        const message = response.headers.get("x-error-message") ?? await response.text();
        throw new Error(`Weixin OC CDN upload client error ${response.status}: ${message}`);
      }
      if (response.status !== 200) {
        const message = response.headers.get("x-error-message") ?? `status ${response.status}`;
        throw new Error(`Weixin OC CDN upload server error: ${message}`);
      }

      const encryptedParam = response.headers.get("x-encrypted-param")?.trim();
      if (!encryptedParam) {
        throw new Error("Weixin OC CDN upload response is missing x-encrypted-param");
      }
      return encryptedParam;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.includes("client error")) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Weixin OC CDN upload failed");
}

function buildCdnUploadUrl(input: {
  uploadParam?: string;
  cdnBaseUrl: string;
  fileKey: string;
}): string {
  if (!input.uploadParam) {
    throw new Error("Weixin OC getuploadurl returned no upload URL");
  }
  const url = new URL(`${input.cdnBaseUrl.replace(/\/+$/, "")}/upload`);
  url.searchParams.set("encrypted_query_param", input.uploadParam);
  url.searchParams.set("filekey", input.fileKey);
  return url.toString();
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function randomBytesHex(length: number): string {
  return bytesToHex(randomBytes(length));
}
