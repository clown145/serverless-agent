import type { Env } from "../../shared/types/env";
import { nowIso } from "../../shared/time";
import { buildVfsBlobKey } from "./blob-keys";
import type { BlobStorage } from "../../storage/blob/types";
import { deleteTextContent, readTextContent, upsertTextContent } from "./content-store";
import { upsertFileEntry } from "./file-entry-writer";
import { insertFileRevision } from "./revision-store";
import { sha256Hex } from "../core/hash";
import { shouldStoreTextInD1 } from "../core/limits";
import { isRootPath, normalizeVfsPath } from "../core/path";
import { vfsConflict, vfsInvalid, vfsNotFound } from "../core/errors";
import { ensureParentDirectories, findVfsEntry, getVfsEntry } from "./entry-store";
import { createBlobStorage } from "../../storage/blob";
import type { VfsBinaryFile, VfsEntry, VfsFile, VfsStorageKind } from "./types";

export type PutVfsFileInput = {
  agentId: string;
  path: string;
  content: string;
  mimeType?: string;
  createdBy: string;
};

export type PutVfsBinaryFileInput = {
  agentId: string;
  path: string;
  bytes: Uint8Array;
  mimeType?: string;
  createdBy: string;
};

export async function putVfsFile(env: Env, input: PutVfsFileInput): Promise<VfsEntry> {
  const path = normalizeVfsPath(input.path);
  if (isRootPath(path)) {
    throw vfsInvalid("Cannot write the VFS root directory as a file");
  }

  const now = nowIso();
  const size = new TextEncoder().encode(input.content).byteLength;
  const checksum = await sha256Hex(input.content);
  const mimeType = input.mimeType ?? "text/plain; charset=utf-8";
  const storageKind: VfsStorageKind = shouldStoreTextInD1(size) ? "d1_text" : "r2_blob";
  const r2Key = storageKind === "r2_blob" ? buildVfsBlobKey(input.agentId, checksum) : undefined;

  await ensureParentDirectories(env.AGENT_DB, {
    agentId: input.agentId,
    path,
    createdBy: input.createdBy,
    now
  });

  const existing = await findVfsEntry(env.AGENT_DB, input.agentId, path);
  if (existing?.kind === "directory") {
    throw vfsConflict(`A directory already exists at ${path}`);
  }

  if (r2Key) {
    const blobStorage = createBlobStorage(env);
    await blobStorage.put(r2Key, input.content, { contentType: mimeType });
    try {
      await writeVfsFileMetadata(env, {
        agentId: input.agentId,
        path,
        storageKind,
        r2Key,
        mimeType,
        size,
        checksum,
        version: existing ? existing.version + 1 : 1,
        content: input.content,
        createdBy: input.createdBy,
        now
      });
    } catch (error) {
      await cleanupUnreferencedBlob(env.AGENT_DB, blobStorage, input.agentId, r2Key);
      throw error;
    }

    return await getVfsEntry(env.AGENT_DB, input.agentId, path);
  }

  const version = existing ? existing.version + 1 : 1;
  await writeVfsFileMetadata(env, {
    agentId: input.agentId,
    path,
    storageKind,
    r2Key,
    mimeType,
    size,
    checksum,
    version,
    content: input.content,
    createdBy: input.createdBy,
    now
  });

  return await getVfsEntry(env.AGENT_DB, input.agentId, path);
}

export async function putVfsBinaryFile(env: Env, input: PutVfsBinaryFileInput): Promise<VfsEntry> {
  const path = normalizeVfsPath(input.path);
  if (isRootPath(path)) {
    throw vfsInvalid("Cannot write the VFS root directory as a file");
  }

  const now = nowIso();
  const size = input.bytes.byteLength;
  const checksum = await sha256Hex(input.bytes);
  const mimeType = input.mimeType ?? "application/octet-stream";
  const storageKind: VfsStorageKind = "r2_blob";
  const r2Key = buildVfsBlobKey(input.agentId, checksum);

  await ensureParentDirectories(env.AGENT_DB, {
    agentId: input.agentId,
    path,
    createdBy: input.createdBy,
    now
  });

  const existing = await findVfsEntry(env.AGENT_DB, input.agentId, path);
  if (existing?.kind === "directory") {
    throw vfsConflict(`A directory already exists at ${path}`);
  }

  const blobStorage = createBlobStorage(env);
  await blobStorage.put(r2Key, input.bytes, { contentType: mimeType });
  try {
    await writeVfsFileMetadata(env, {
      agentId: input.agentId,
      path,
      storageKind,
      r2Key,
      mimeType,
      size,
      checksum,
      version: existing ? existing.version + 1 : 1,
      content: "",
      createdBy: input.createdBy,
      now
    });
  } catch (error) {
    await cleanupUnreferencedBlob(env.AGENT_DB, blobStorage, input.agentId, r2Key);
    throw error;
  }

  return await getVfsEntry(env.AGENT_DB, input.agentId, path);
}

async function writeVfsFileMetadata(
  env: Env,
  input: {
    agentId: string;
    path: string;
    storageKind: VfsStorageKind;
    r2Key?: string;
    mimeType: string;
    size: number;
    checksum: string;
    version: number;
    content: string;
    createdBy: string;
    now: string;
  }
): Promise<void> {
  await upsertFileEntry(env.AGENT_DB, {
    agentId: input.agentId,
    path: input.path,
    storageKind: input.storageKind,
    r2Key: input.r2Key,
    mimeType: input.mimeType,
    size: input.size,
    checksum: input.checksum,
    version: input.version,
    createdBy: input.createdBy,
    now: input.now
  });

  if (input.storageKind === "d1_text") {
    await upsertTextContent(env.AGENT_DB, {
      agentId: input.agentId,
      path: input.path,
      content: input.content,
      mimeType: input.mimeType,
      size: input.size,
      checksum: input.checksum,
      version: input.version,
      now: input.now
    });
  } else {
    await deleteTextContent(env.AGENT_DB, input.agentId, input.path);
  }

  await insertFileRevision(env.AGENT_DB, {
    agentId: input.agentId,
    path: input.path,
    storageKind: input.storageKind,
    r2Key: input.r2Key,
    content: input.storageKind === "d1_text" ? input.content : undefined,
    mimeType: input.mimeType,
    size: input.size,
    checksum: input.checksum,
    version: input.version,
    createdBy: input.createdBy,
    now: input.now
  });
}

async function cleanupUnreferencedBlob(
  db: D1Database,
  blobStorage: BlobStorage,
  agentId: string,
  r2Key: string
): Promise<void> {
  const row = await db
    .prepare(
      `SELECT r2_key FROM vfs_entries WHERE agent_id = ? AND r2_key = ?
       UNION ALL
       SELECT r2_key FROM vfs_revisions WHERE agent_id = ? AND r2_key = ?
       LIMIT 1`
    )
    .bind(agentId, r2Key, agentId, r2Key)
    .first<{ r2_key: string }>();

  if (!row) {
    await blobStorage.delete(r2Key).catch(() => undefined);
  }
}

export async function getVfsFile(env: Env, agentId: string, path: string): Promise<VfsFile> {
  const normalized = normalizeVfsPath(path);
  const entry = await findVfsEntry(env.AGENT_DB, agentId, normalized);

  if (!entry || entry.kind !== "file") {
    throw vfsNotFound(normalized);
  }

  const content = await readTextContent(env.AGENT_DB, agentId, normalized);
  if (content) {
    return {
      path: normalized,
      content: content.content,
      mimeType: content.mime_type ?? entry.mimeType,
      size: content.size ?? entry.size,
      checksum: content.checksum ?? entry.checksum,
      version: content.version ?? entry.version
    };
  }

  if (!entry.r2Key) {
    throw vfsNotFound(normalized);
  }

  const object = await createBlobStorage(env).get(entry.r2Key);
  if (!object) {
    throw new Error(`VFS object not found: ${normalized}`);
  }

  return {
    path: normalized,
    content: await object.text(),
    mimeType: entry.mimeType,
    size: entry.size,
    checksum: entry.checksum,
    version: entry.version
  };
}

export async function getVfsBinaryFile(
  env: Env,
  agentId: string,
  path: string
): Promise<VfsBinaryFile> {
  const normalized = normalizeVfsPath(path);
  const entry = await findVfsEntry(env.AGENT_DB, agentId, normalized);

  if (!entry || entry.kind !== "file") {
    throw vfsNotFound(normalized);
  }

  const content = await readTextContent(env.AGENT_DB, agentId, normalized);
  if (content) {
    return {
      path: normalized,
      bytes: new TextEncoder().encode(content.content),
      mimeType: content.mime_type ?? entry.mimeType,
      size: content.size ?? entry.size,
      checksum: content.checksum ?? entry.checksum,
      version: content.version ?? entry.version
    };
  }

  if (!entry.r2Key) {
    throw vfsNotFound(normalized);
  }

  const object = await createBlobStorage(env).get(entry.r2Key);
  if (!object) {
    throw new Error(`VFS object not found: ${normalized}`);
  }

  return {
    path: normalized,
    bytes: new Uint8Array(await object.arrayBuffer()),
    mimeType: entry.mimeType,
    size: entry.size,
    checksum: entry.checksum,
    version: entry.version
  };
}
