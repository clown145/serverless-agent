import type { Env } from "../../shared/types/env";
import { createD1LiteBlobStorage } from "./d1-lite-storage";
import { createR2BlobStorage } from "./r2-storage";
import { createS3BlobStorage } from "./s3-storage";
import type { BlobStorage, BlobStorageBackend } from "./types";

export function createBlobStorage(env: Env): BlobStorage {
  const backend = resolveBlobStorageBackend(env);
  if (backend === "d1_lite") {
    return createD1LiteBlobStorage(env.AGENT_DB);
  }

  if (backend === "s3") {
    return createS3BlobStorage({
      endpoint: requireEnv(env.S3_ENDPOINT, "S3_ENDPOINT"),
      bucket: requireEnv(env.S3_BUCKET, "S3_BUCKET"),
      region: env.S3_REGION || "auto",
      accessKeyId: requireEnv(env.S3_ACCESS_KEY_ID, "S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv(env.S3_SECRET_ACCESS_KEY, "S3_SECRET_ACCESS_KEY"),
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "true"
    });
  }

  if (!env.AGENT_BUCKET) {
    return createD1LiteBlobStorage(env.AGENT_DB);
  }

  return createR2BlobStorage(env.AGENT_BUCKET);
}

export function resolveBlobStorageBackend(env: Env): BlobStorageBackend {
  const configured = env.OBJECT_STORAGE_BACKEND;
  if (configured === "s3" || configured === "d1_lite") {
    return configured;
  }

  return "r2";
}

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required for S3 object storage`);
  }
  return value;
}
