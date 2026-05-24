import { buildVfsBlobKey, buildVfsPathObjectKey } from "../vfs/storage/blob-keys";

export function buildVfsObjectKey(agentId: string, path: string): string {
  return buildVfsPathObjectKey(agentId, path);
}

export { buildVfsBlobKey };
