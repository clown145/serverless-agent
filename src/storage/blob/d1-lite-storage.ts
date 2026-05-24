import { nowIso } from "../../shared/time";
import type { BlobObject, BlobStorage } from "./types";
import { base64FromBytes, blobObjectFromBytes, bytesFromBase64, bytesFromBlobValue } from "./utils";

export const D1_LITE_OBJECT_LIMIT_BYTES = 256 * 1024;

type BlobObjectRow = {
  key: string;
  body_base64: string;
  content_type?: string | null;
  size: number;
  created_at: string;
  updated_at: string;
};

export function createD1LiteBlobStorage(db: D1Database): BlobStorage {
  return {
    backend: "d1_lite",
    async put(key, value, options) {
      const bytes = bytesFromBlobValue(value);
      if (bytes.byteLength > D1_LITE_OBJECT_LIMIT_BYTES) {
        throw new Error(
          `D1 lite object storage only supports objects up to ${D1_LITE_OBJECT_LIMIT_BYTES} bytes`
        );
      }

      const now = nowIso();
      await db
        .prepare(
          `INSERT INTO blob_objects (
            key, body_base64, content_type, size, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(key)
          DO UPDATE SET
            body_base64 = excluded.body_base64,
            content_type = excluded.content_type,
            size = excluded.size,
            updated_at = excluded.updated_at`
        )
        .bind(key, base64FromBytes(bytes), options?.contentType ?? null, bytes.byteLength, now, now)
        .run();
    },
    async get(key) {
      const row = await db
        .prepare("SELECT * FROM blob_objects WHERE key = ?")
        .bind(key)
        .first<BlobObjectRow>();
      return row ? rowToBlobObject(row) : undefined;
    },
    async head(key) {
      const row = await db
        .prepare("SELECT key, content_type, size FROM blob_objects WHERE key = ?")
        .bind(key)
        .first<Pick<BlobObjectRow, "key" | "content_type" | "size">>();
      return row
        ? {
            key: row.key,
            size: row.size,
            contentType: row.content_type ?? undefined
          }
        : undefined;
    },
    async delete(key) {
      await db.prepare("DELETE FROM blob_objects WHERE key = ?").bind(key).run();
    }
  };
}

function rowToBlobObject(row: BlobObjectRow): BlobObject {
  return blobObjectFromBytes({
    key: row.key,
    bytes: bytesFromBase64(row.body_base64),
    contentType: row.content_type ?? undefined
  });
}
