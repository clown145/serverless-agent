import { describe, expect, it } from "vitest";
import type { Env } from "../../src/shared/types/env";
import { VFS_D1_TEXT_LIMIT_BYTES } from "../../src/vfs/core/limits";
import { putVfsFile } from "../../src/vfs/storage/file-store";

describe("VFS file store", () => {
  it("cleans up an unreferenced blob when D1 metadata write fails", async () => {
    const bucket = createR2BucketMock();
    const env = {
      AGENT_DB: createMetadataFailureDb({ blobReferenced: false }),
      AGENT_BUCKET: bucket as unknown as R2Bucket,
      OBJECT_STORAGE_BACKEND: "r2"
    } as unknown as Env;

    await expect(
      putVfsFile(env, {
        agentId: "default",
        path: "/large.txt",
        content: largeContent(),
        createdBy: "test"
      })
    ).rejects.toThrow("metadata write failed");

    expect(bucket.objects.size).toBe(0);
    expect(bucket.deletedKeys).toHaveLength(1);
  });

  it("does not delete a blob that is already referenced by D1", async () => {
    const bucket = createR2BucketMock();
    const env = {
      AGENT_DB: createMetadataFailureDb({ blobReferenced: true }),
      AGENT_BUCKET: bucket as unknown as R2Bucket,
      OBJECT_STORAGE_BACKEND: "r2"
    } as unknown as Env;

    await expect(
      putVfsFile(env, {
        agentId: "default",
        path: "/large.txt",
        content: largeContent(),
        createdBy: "test"
      })
    ).rejects.toThrow("metadata write failed");

    expect(bucket.objects.size).toBe(1);
    expect(bucket.deletedKeys).toHaveLength(0);
  });
});

function largeContent(): string {
  return "x".repeat(VFS_D1_TEXT_LIMIT_BYTES + 1);
}

function createMetadataFailureDb(input: { blobReferenced: boolean }): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => ({
        first: async () => {
          if (sql.includes("UNION ALL")) {
            return input.blobReferenced ? { r2_key: values[1] } : null;
          }

          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => {
          if (sql.includes("INSERT INTO vfs_entries") && sql.includes("'file'")) {
            throw new Error("metadata write failed");
          }

          return { success: true, meta: { changes: 1 } } as D1Result;
        }
      })
    })
  } as unknown as D1Database;
}

function createR2BucketMock(): R2Bucket & {
  objects: Map<string, string | Uint8Array | ArrayBuffer>;
  deletedKeys: string[];
} {
  const objects = new Map<string, string | Uint8Array | ArrayBuffer>();
  const deletedKeys: string[] = [];

  return {
    objects,
    deletedKeys,
    put: async (key: string, value: string | Uint8Array | ArrayBuffer) => {
      objects.set(key, value);
      return null as unknown as R2Object;
    },
    delete: async (key: string) => {
      deletedKeys.push(key);
      objects.delete(key);
    },
    get: async () => null,
    head: async () => null
  } as unknown as R2Bucket & {
    objects: Map<string, string | Uint8Array | ArrayBuffer>;
    deletedKeys: string[];
  };
}
