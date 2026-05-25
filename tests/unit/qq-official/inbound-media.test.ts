import { afterEach, describe, expect, it, vi } from "vitest";
import { persistQqOfficialInboundMedia } from "../../../src/adapters/qq/official/inbound-media";
import { D1_LITE_OBJECT_LIMIT_BYTES } from "../../../src/storage/blob/d1-lite-storage";
import type { Env } from "../../../src/shared/types/env";
import type { InternalMessage } from "../../../src/shared/types/internal-message";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("QQ official inbound media", () => {
  it("downloads and stores HTTP image attachments for captioning", async () => {
    const stored = new Map<string, { bytes: Uint8Array; contentType?: string }>();
    const imageBytes = new TextEncoder().encode("fake-png-bytes");
    const fetchMock = vi.fn(
      async () =>
        new Response(imageBytes, {
          headers: {
            "content-type": "image/png",
            "content-length": String(imageBytes.byteLength)
          }
        })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await persistQqOfficialInboundMedia(envWithBucket(stored), message());

    expect(fetchMock).toHaveBeenCalledWith("https://cdn.qq.com/image.png");
    expect(result.message.attachments[0]).toMatchObject({
      r2Key: "attachments/agent-1/msg_qq/qq_attachment_0",
      mimeType: "image/png",
      size: imageBytes.byteLength
    });
    expect(
      new TextDecoder().decode(stored.get("attachments/agent-1/msg_qq/qq_attachment_0")?.bytes)
    ).toBe("fake-png-bytes");
    expect(stored.get("attachments/agent-1/msg_qq/qq_attachment_0")?.contentType).toBe("image/png");
  });

  it("prefers downloaded image content type over generic attachment MIME type", async () => {
    const stored = new Map<string, { bytes: Uint8Array; contentType?: string }>();
    const imageBytes = new TextEncoder().encode("fake-png-bytes");
    const fetchMock = vi.fn(
      async () =>
        new Response(imageBytes, {
          headers: {
            "content-type": "image/png"
          }
        })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await persistQqOfficialInboundMedia(envWithBucket(stored), message("image"));

    expect(result.message.attachments[0]).toMatchObject({
      mimeType: "image/png"
    });
    expect(stored.get("attachments/agent-1/msg_qq/qq_attachment_0")?.contentType).toBe("image/png");
  });

  it("returns an oversized rejection before downloading when content length exceeds the limit", async () => {
    const stored = new Map<string, { bytes: Uint8Array; contentType?: string }>();
    const fetchMock = vi.fn(
      async () =>
        new Response("too-large", {
          headers: {
            "content-length": String(8 * 1024 * 1024 + 1)
          }
        })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await persistQqOfficialInboundMedia(envWithBucket(stored), message());

    expect(result.rejection).toMatchObject({
      code: "attachment_too_large",
      attachmentIds: ["qq_attachment_0"],
      responseText: "The image exceeds the 8 MiB size limit."
    });
    expect(result.message.attachments[0]).not.toHaveProperty("r2Key");
    expect(stored.size).toBe(0);
  });

  it("uses the d1_lite object limit when that backend is configured", async () => {
    const stored = new Map<string, { bytes: Uint8Array; contentType?: string }>();
    const fetchMock = vi.fn(
      async () =>
        new Response("too-large-for-d1", {
          headers: {
            "content-length": String(D1_LITE_OBJECT_LIMIT_BYTES + 1)
          }
        })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await persistQqOfficialInboundMedia(
      envWithBucket(stored, { objectStorageBackend: "d1_lite" }),
      message()
    );

    expect(result.rejection).toMatchObject({
      code: "attachment_too_large",
      responseText: "The image exceeds the 256 KiB size limit."
    });
    expect(stored.size).toBe(0);
  });
});

function envWithBucket(
  stored: Map<string, { bytes: Uint8Array; contentType?: string }>,
  options: { objectStorageBackend?: "r2" | "s3" | "d1_lite" } = {}
): Env {
  return {
    OBJECT_STORAGE_BACKEND: options.objectStorageBackend,
    AGENT_BUCKET: {
      put: async (key: string, value: unknown, options?: R2PutOptions) => {
        const metadata = options?.httpMetadata as R2HTTPMetadata | undefined;
        stored.set(key, {
          bytes: value as Uint8Array,
          contentType: metadata?.contentType
        });
        return {} as R2Object;
      }
    }
  } as Env;
}

function message(mimeType?: string): InternalMessage {
  return {
    id: "msg_qq",
    platform: "qq",
    platformMessageId: "qq-msg-1",
    agentId: "agent-1",
    conversationId: "qq:c2c:user-openid",
    sender: {
      platformUserId: "user-openid",
      role: "unknown"
    },
    kind: "attachment",
    attachments: [
      {
        id: "qq_attachment_0",
        type: "image",
        mimeType,
        sourceUrl: "https://cdn.qq.com/image.png"
      }
    ],
    receivedAt: "2026-01-01T00:00:00.000Z"
  };
}
