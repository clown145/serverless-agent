import { afterEach, describe, expect, it, vi } from "vitest";
import { persistWeixinOcInboundMedia } from "../../../src/adapters/weixin-oc/inbound-media";
import { encryptAes128EcbPkcs7 } from "../../../src/security/aes-ecb";
import { bytesToBase64 } from "../../../src/security/base64";
import type { Env } from "../../../src/shared/types/env";
import type { InternalMessage } from "../../../src/shared/types/internal-message";
import type { WeixinOcBotConfig } from "../../../src/adapters/weixin-oc/config";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Weixin OC inbound media", () => {
  it("downloads, decrypts, and stores inbound image attachments", async () => {
    const stored = new Map<string, Uint8Array>();
    const keyHex = "00112233445566778899aabbccddeeff";
    const plaintext = new TextEncoder().encode("fake-jpeg-bytes");
    const ciphertext = encryptAes128EcbPkcs7(plaintext, hexToBytes(keyHex));
    const fetchMock = vi.fn(async () => new Response(ciphertext));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await persistWeixinOcInboundMedia(
      envWithBucket(stored),
      config(),
      message({
        sourceUrl: `weixin-oc:cdn:${btoa(JSON.stringify({
          media: {
            encrypt_query_param: "download-param",
            aes_key: bytesToBase64(new TextEncoder().encode(keyHex))
          }
        }))}`
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://novac2c.cdn.weixin.qq.com/c2c/download?encrypted_query_param=download-param"
    );
    expect(result.attachments[0]).toMatchObject({
      r2Key: "attachments/default/msg_1/wxoc_image_0",
      size: plaintext.byteLength
    });
    expect(new TextDecoder().decode(stored.get("attachments/default/msg_1/wxoc_image_0"))).toBe(
      "fake-jpeg-bytes"
    );
  });
});

function envWithBucket(stored: Map<string, Uint8Array>): Env {
  return {
    AGENT_BUCKET: {
      put: async (key: string, value: unknown) => {
        stored.set(key, value as Uint8Array);
        return {} as R2Object;
      }
    }
  } as Env;
}

function config(): WeixinOcBotConfig {
  return {
    agentId: "default",
    integrationId: "int_1",
    name: "WeChat",
    baseUrl: "https://ilinkai.weixin.qq.com",
    cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
    botType: "3",
    qrPollIntervalMs: 1000,
    longPollTimeoutMs: 35000,
    apiTimeoutMs: 15000,
    syncBuf: "",
    contextTokens: {},
    integration: { id: "int_1" } as WeixinOcBotConfig["integration"]
  };
}

function message(attachment: { sourceUrl: string }): InternalMessage {
  return {
    id: "msg_1",
    platform: "weixin_oc",
    platformMessageId: "wx_1",
    agentId: "default",
    conversationId: "weixin_oc:user",
    sender: {
      platformUserId: "user",
      role: "member"
    },
    kind: "attachment",
    text: "[image]",
    attachments: [
      {
        id: "wxoc_image_0",
        type: "image",
        mimeType: "image/jpeg",
        sourceUrl: attachment.sourceUrl
      }
    ],
    receivedAt: "2026-01-01T00:00:00.000Z"
  };
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
