import { normalizeVfsPath } from "../tools/vfs/path";

export function buildVfsObjectKey(agentId: string, path: string): string {
  const normalized = normalizeVfsPath(path).replace(/^\//, "");
  return `agents/${agentId}/vfs/${normalized}`;
}
