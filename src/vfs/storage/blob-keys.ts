import { normalizeVfsPath } from "../core/path";

export function buildVfsPathObjectKey(agentId: string, path: string): string {
  const normalized = normalizeVfsPath(path).replace(/^\//, "");
  return `agents/${agentId}/vfs/${normalized}`;
}

export function buildVfsBlobKey(agentId: string, checksum: string): string {
  const prefix = checksum.slice(0, 2);
  const shard = checksum.slice(2, 4);
  return `agents/${agentId}/vfs/blobs/sha256/${prefix}/${shard}/${checksum}`;
}
