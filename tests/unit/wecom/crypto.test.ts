import { describe, expect, it } from "vitest";
import {
  createWecomSignature,
  decryptWecomCallback,
  verifyWecomSignature
} from "../../../src/adapters/wecom/crypto";
import { bytesToBase64 } from "../../../src/security/base64";

describe("WeCom crypto helpers", () => {
  it("creates and verifies SHA-1 callback signatures", async () => {
    const signature = await createWecomSignature("token", "12345", "nonce", "encrypted");

    expect(signature).toMatch(/^[0-9a-f]{40}$/);
    await expect(
      verifyWecomSignature({
        token: "token",
        timestamp: "12345",
        nonce: "nonce",
        encrypted: "encrypted",
        signature
      })
    ).resolves.toBe(true);
  });

  it("decrypts encrypted callback XML", async () => {
    const token = "token";
    const corpId = "ww123";
    const encodingAesKey = bytesToBase64(
      new Uint8Array(Array.from({ length: 32 }, (_, index) => index))
    ).replace(/=+$/g, "");
    const plainXml = "<xml><Event><![CDATA[kf_msg_or_event]]></Event></xml>";
    const encrypted = await encryptForTest(encodingAesKey, plainXml, corpId);
    const timestamp = "12345";
    const nonce = "nonce";
    const msgSignature = await createWecomSignature(token, timestamp, nonce, encrypted);

    await expect(
      decryptWecomCallback({
        token,
        encodingAesKey,
        corpId,
        msgSignature,
        timestamp,
        nonce,
        body: `<xml><Encrypt><![CDATA[${encrypted}]]></Encrypt></xml>`
      })
    ).resolves.toBe(plainXml);
  });
});

async function encryptForTest(
  encodingAesKey: string,
  message: string,
  receiveId: string
): Promise<string> {
  const keyBytes = base64ToBytesForTest(encodingAesKey);
  const messageBytes = new TextEncoder().encode(message);
  const receiveIdBytes = new TextEncoder().encode(receiveId);
  const plain = new Uint8Array(20 + messageBytes.length + receiveIdBytes.length);
  plain.set(new Uint8Array(16), 0);
  writeUInt32BE(plain, messageBytes.length, 16);
  plain.set(messageBytes, 20);
  plain.set(receiveIdBytes, 20 + messageBytes.length);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, [
    "encrypt"
  ]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: keyBytes.slice(0, 16) },
    key,
    plain
  );
  return bytesToBase64(new Uint8Array(encrypted));
}

function base64ToBytesForTest(value: string): Uint8Array {
  const normalized = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function writeUInt32BE(bytes: Uint8Array, value: number, offset: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}
