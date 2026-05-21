import { base64ToBytes, bytesToBase64 } from "../../security/base64";
import { extractEncryptValue } from "./xml";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export class WecomCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WecomCryptoError";
  }
}

export async function verifyWecomSignature(input: {
  token: string;
  signature: string;
  timestamp: string;
  nonce: string;
  encrypted: string;
}): Promise<boolean> {
  return (await createWecomSignature(input.token, input.timestamp, input.nonce, input.encrypted)) === input.signature;
}

export async function createWecomSignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypted: string
): Promise<string> {
  const raw = [token, timestamp, nonce, encrypted].sort().join("");
  const digest = await crypto.subtle.digest("SHA-1", textEncoder.encode(raw));
  return hex(new Uint8Array(digest));
}

export async function decryptWecomCallback(input: {
  token: string;
  encodingAesKey: string;
  corpId: string;
  msgSignature: string;
  timestamp: string;
  nonce: string;
  body: string;
}): Promise<string> {
  const encrypted = extractEncryptValue(input.body);
  if (!encrypted) {
    throw new WecomCryptoError("WeCom callback body is missing Encrypt");
  }

  const verified = await verifyWecomSignature({
    token: input.token,
    signature: input.msgSignature,
    timestamp: input.timestamp,
    nonce: input.nonce,
    encrypted
  });
  if (!verified) {
    throw new WecomCryptoError("Invalid WeCom callback signature");
  }

  return decryptWecomPayload(input.encodingAesKey, encrypted, input.corpId);
}

export async function verifyWecomUrl(input: {
  token: string;
  encodingAesKey: string;
  corpId: string;
  msgSignature: string;
  timestamp: string;
  nonce: string;
  echoStr: string;
}): Promise<string> {
  const verified = await verifyWecomSignature({
    token: input.token,
    signature: input.msgSignature,
    timestamp: input.timestamp,
    nonce: input.nonce,
    encrypted: input.echoStr
  });
  if (!verified) {
    throw new WecomCryptoError("Invalid WeCom URL verification signature");
  }

  return decryptWecomPayload(input.encodingAesKey, input.echoStr, input.corpId);
}

async function decryptWecomPayload(
  encodingAesKey: string,
  encrypted: string,
  corpId: string
): Promise<string> {
  const aesKey = decodeEncodingAesKey(encodingAesKey);
  const encryptedBytes = base64ToBytes(normalizeBase64(encrypted));
  const key = await crypto.subtle.importKey("raw", aesKey, { name: "AES-CBC" }, false, [
    "decrypt"
  ]);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: aesKey.slice(0, 16) },
    key,
    encryptedBytes
  );
  const plain = new Uint8Array(decryptedBuffer);
  if (plain.length < 20) {
    throw new WecomCryptoError("Invalid decrypted WeCom payload");
  }

  const messageLength = readUInt32BE(plain, 16);
  const messageStart = 20;
  const messageEnd = messageStart + messageLength;
  if (messageEnd > plain.length) {
    throw new WecomCryptoError("Invalid WeCom message length");
  }

  const message = textDecoder.decode(plain.slice(messageStart, messageEnd));
  const receiveId = textDecoder.decode(plain.slice(messageEnd));
  if (receiveId && receiveId !== corpId) {
    throw new WecomCryptoError("Invalid WeCom receive id");
  }

  return message;
}

function decodeEncodingAesKey(encodingAesKey: string): Uint8Array {
  const key = base64ToBytes(normalizeBase64(encodingAesKey));
  if (key.length !== 32) {
    throw new WecomCryptoError("Invalid WeCom EncodingAESKey length");
  }
  return key;
}

function normalizeBase64(value: string): string {
  return `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
}

function readUInt32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  ) >>> 0;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function bytesToWecomBase64(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/=+$/g, "");
}
