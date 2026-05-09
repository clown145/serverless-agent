import type { Env } from "../../shared/types/env";
import { nowIso } from "../../shared/time";
import { buildVfsBlobKey } from "./blob-keys";
import { deleteTextContent, readTextContent, upsertTextContent } from "./content-store";
import { upsertFileEntry } from "./file-entry-writer";
import { insertFileRevision } from "./revision-store";
import { sha256Hex } from "../core/hash";
import { shouldStoreTextInD1 } from "../core/limits";
import { isRootPath, normalizeVfsPath } from "../core/path";
import { vfsConflict, vfsInvalid, vfsNotFound } from "../core/errors";
import { ensureParentDirectories, findVfsEntry, getVfsEntry } from "./entry-store";
import type { VfsEntry, VfsFile, VfsStorageKind } from "./types";

export type PutVfsFileInput = {
  agentId: string;
  path: string;
  content: string;
  mimeType?: string;
  createdBy: string;
};

export async function putVfsFile(
  env: Env,
  input: PutVfsFileInput
): Promise<VfsEntry> {
  const path = normalizeVfsPath(input.path);
  if (isRootPath(path)) {
    throw vfsInvalid("Cannot write the VFS root directory as a file");
  }

  const now = nowIso();
  const size = new TextEncoder().encode(input.content).byteLength;
  const checksum = await sha256Hex(input.content);
  const mimeType = input.mimeType ?? "text/plain; charset=utf-8";
  const storageKind: VfsStorageKind = shouldStoreTextInD1(size)
    ? "d1_text"
    : "r2_blob";
  const r2Key =
    storageKind === "r2_blob"
      ? buildVfsBlobKey(input.agentId, checksum)
      : undefined;

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
    await env.AGENT_BUCKET.put(r2Key, input.content, {
      httpMetadata: { contentType: mimeType }
    });
  }

  const version = existing ? existing.version + 1 : 1;
  await upsertFileEntry(env.AGENT_DB, {
    agentId: input.agentId,
    path,
    storageKind,
    r2Key,
    mimeType,
    size,
    checksum,
    version,
    createdBy: input.createdBy,
    now
  });

  if (storageKind === "d1_text") {
    await upsertTextContent(env.AGENT_DB, {
      agentId: input.agentId,
      path,
      content: input.content,
      mimeType,
      size,
      checksum,
      version,
      now
    });
  } else {
    await deleteTextContent(env.AGENT_DB, input.agentId, path);
  }

  await insertFileRevision(env.AGENT_DB, {
    agentId: input.agentId,
    path,
    storageKind,
    r2Key,
    content: storageKind === "d1_text" ? input.content : undefined,
    mimeType,
    size,
    checksum,
    version,
    createdBy: input.createdBy,
    now
  });

  return await getVfsEntry(env.AGENT_DB, input.agentId, path);
}

export async function getVfsFile(
  env: Env,
  agentId: string,
  path: string
): Promise<VfsFile> {
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

  const object = await env.AGENT_BUCKET.get(entry.r2Key);
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
