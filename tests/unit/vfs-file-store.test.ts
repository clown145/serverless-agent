import { describe, expect, it } from "vitest";
import type { Env } from "../../src/shared/types/env";
import { VFS_D1_TEXT_LIMIT_BYTES } from "../../src/vfs/core/limits";
import { getVfsBinaryFile, putVfsBinaryFile, putVfsFile } from "../../src/vfs/storage/file-store";

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

  it("stores and reads binary files without text conversion", async () => {
    const bucket = createR2BucketMock();
    const env = {
      AGENT_DB: createBinaryMetadataDb(),
      AGENT_BUCKET: bucket as unknown as R2Bucket,
      OBJECT_STORAGE_BACKEND: "r2"
    } as unknown as Env;
    const bytes = new Uint8Array([0, 1, 2, 255]);

    await putVfsBinaryFile(env, {
      agentId: "default",
      path: "/files/blob.bin",
      bytes,
      mimeType: "application/octet-stream",
      createdBy: "test"
    });

    const file = await getVfsBinaryFile(env, "default", "/files/blob.bin");
    expect(Array.from(file.bytes)).toEqual([0, 1, 2, 255]);
    expect(file.mimeType).toBe("application/octet-stream");
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
    get: async (key: string) => {
      const value = objects.get(key);
      if (!value) {
        return null;
      }
      const bytes =
        typeof value === "string"
          ? new TextEncoder().encode(value)
          : value instanceof Uint8Array
            ? value
            : new Uint8Array(value);
      return {
        key,
        size: bytes.byteLength,
        body: new Response(bytes).body,
        arrayBuffer: async () => bytes.buffer.slice(0),
        text: async () => new TextDecoder().decode(bytes),
        httpMetadata: { contentType: "application/octet-stream" }
      } as unknown as R2ObjectBody;
    },
    head: async () => null
  } as unknown as R2Bucket & {
    objects: Map<string, string | Uint8Array | ArrayBuffer>;
    deletedKeys: string[];
  };
}

function createBinaryMetadataDb(): D1Database {
  let entry:
    | {
        path: string;
        r2_key: string;
        mime_type: string;
        size: number;
        checksum: string;
        version: number;
      }
    | undefined;

  return {
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM vfs_entries")) {
            return entry
              ? {
                  id: "vfs_entry",
                  agent_id: "default",
                  path: entry.path,
                  kind: "file",
                  storage_kind: "r2_blob",
                  r2_key: entry.r2_key,
                  mime_type: entry.mime_type,
                  size: entry.size,
                  checksum: entry.checksum,
                  version: entry.version,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              : null;
          }
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => {
          if (sql.includes("INSERT INTO vfs_entries")) {
            entry = {
              path: values[2] as string,
              r2_key: values[5] as string,
              mime_type: values[6] as string,
              size: values[7] as number,
              checksum: values[8] as string,
              version: values[9] as number
            };
          }
          return { success: true, meta: { changes: 1 } } as D1Result;
        }
      })
    })
  } as unknown as D1Database;
}
