import type { BlobPutOptions, BlobStorage } from "./types";
import { blobObjectFromBytes, bytesFromBlobValue } from "./utils";
import { presignS3Url } from "./s3-signing";

export type S3BlobStorageConfig = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export function createS3BlobStorage(config: S3BlobStorageConfig): BlobStorage {
  return {
    backend: "s3",
    async put(key, value, options) {
      const bytes = bytesFromBlobValue(value);
      const response = await fetch(await sign(config, "PUT", key, options), {
        method: "PUT",
        headers: options?.contentType ? { "content-type": options.contentType } : undefined,
        body: bytes
      });
      if (!response.ok) {
        throw new Error(`S3 put failed ${response.status}: ${await response.text()}`);
      }
    },
    async get(key) {
      const response = await fetch(await sign(config, "GET", key), { method: "GET" });
      if (response.status === 404) {
        return undefined;
      }
      if (!response.ok) {
        throw new Error(`S3 get failed ${response.status}: ${await response.text()}`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      return blobObjectFromBytes({
        key,
        bytes,
        contentType: response.headers.get("content-type") ?? undefined
      });
    },
    async head(key) {
      const response = await fetch(await sign(config, "HEAD", key), { method: "HEAD" });
      if (response.status === 404) {
        return undefined;
      }
      if (!response.ok) {
        throw new Error(`S3 head failed ${response.status}`);
      }
      return {
        key,
        size: Number(response.headers.get("content-length") ?? 0),
        contentType: response.headers.get("content-type") ?? undefined
      };
    },
    async delete(key) {
      const response = await fetch(await sign(config, "DELETE", key), { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error(`S3 delete failed ${response.status}: ${await response.text()}`);
      }
    }
  };
}

async function sign(
  config: S3BlobStorageConfig,
  method: "GET" | "PUT" | "HEAD" | "DELETE",
  key: string,
  options: BlobPutOptions = {}
): Promise<string> {
  return presignS3Url({
    method,
    endpoint: config.endpoint,
    bucket: config.bucket,
    key,
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    forcePathStyle: config.forcePathStyle,
    contentType: options.contentType
  });
}
