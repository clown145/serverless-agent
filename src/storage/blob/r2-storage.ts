import type { BlobObject, BlobPutOptions, BlobStorage } from "./types";

export function createR2BlobStorage(bucket: R2Bucket): BlobStorage {
  return {
    backend: "r2",
    async put(key, value, options) {
      await bucket.put(key, value, {
        httpMetadata: options?.contentType ? { contentType: options.contentType } : undefined
      });
    },
    async get(key) {
      const object = await bucket.get(key);
      return object ? r2ObjectToBlobObject(key, object) : undefined;
    },
    async head(key) {
      const object = await bucket.head(key);
      return object
        ? {
            key,
            size: object.size,
            contentType: object.httpMetadata?.contentType
          }
        : undefined;
    },
    async delete(key) {
      await bucket.delete(key);
    }
  };
}

function r2ObjectToBlobObject(key: string, object: R2ObjectBody): BlobObject {
  return {
    key,
    size: object.size,
    contentType: object.httpMetadata?.contentType,
    body: object.body,
    arrayBuffer: () => object.arrayBuffer(),
    text: () => object.text()
  };
}
