import { describe, expect, it } from "vitest";
import { createBlobStorage } from "../../src/storage/blob";
import { D1_LITE_OBJECT_LIMIT_BYTES } from "../../src/storage/blob/d1-lite-storage";
import { presignS3Url } from "../../src/storage/blob/s3-signing";
import type { Env } from "../../src/shared/types/env";

describe("blob storage", () => {
  it("uses D1 lite storage when no R2 binding is available", async () => {
    const env = { AGENT_DB: createD1Mock() } as unknown as Env;
    const storage = createBlobStorage(env);

    expect(storage.backend).toBe("d1_lite");
    await storage.put("objects/hello.txt", "hello", {
      contentType: "text/plain"
    });

    const object = await storage.get("objects/hello.txt");
    await expect(object?.text()).resolves.toBe("hello");
    await expect(storage.head("objects/hello.txt")).resolves.toMatchObject({
      key: "objects/hello.txt",
      size: 5,
      contentType: "text/plain"
    });
  });

  it("limits D1 lite objects", async () => {
    const storage = createBlobStorage({
      AGENT_DB: createD1Mock(),
      OBJECT_STORAGE_BACKEND: "d1_lite"
    } as unknown as Env);

    await expect(
      storage.put("objects/large.bin", new Uint8Array(D1_LITE_OBJECT_LIMIT_BYTES + 1))
    ).rejects.toThrow("D1 lite object storage only supports objects");
  });

  it("presigns S3-compatible URLs", async () => {
    const url = await presignS3Url({
      method: "PUT",
      endpoint: "https://s3.example.com",
      bucket: "agent-bucket",
      key: "attachments/a b.txt",
      region: "auto",
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
      forcePathStyle: true
    });

    expect(url).toContain("https://s3.example.com/agent-bucket/attachments/a%20b.txt?");
    expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(url).toContain("X-Amz-Signature=");
  });
});

function createD1Mock(): D1Database {
  const rows = new Map<string, Record<string, unknown>>();
  const statement = {
    bind: (...values: unknown[]) => ({
      first: async () => {
        const key = values[0] as string;
        return rows.get(key) ?? null;
      },
      run: async () => {
        const key = values[0] as string;
        if (values.length > 1) {
          rows.set(key, {
            key,
            body_base64: values[1],
            content_type: values[2],
            size: values[3],
            created_at: values[4],
            updated_at: values[5]
          });
        } else {
          rows.delete(key);
        }
        return { success: true, meta: { changes: 1 } } as D1Result;
      }
    })
  };

  return {
    prepare: () => statement
  } as unknown as D1Database;
}
