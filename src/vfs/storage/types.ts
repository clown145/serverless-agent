export type VfsEntryKind = "file" | "directory";

export type VfsStorageKind = "d1_text" | "r2_blob" | "legacy_r2" | "directory";

export type VfsEntry = {
  id: string;
  agentId: string;
  path: string;
  kind: VfsEntryKind;
  storageKind: VfsStorageKind;
  r2Key?: string;
  mimeType?: string;
  size?: number;
  checksum?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type VfsEntryRow = {
  id: string;
  agent_id: string;
  path: string;
  kind: VfsEntryKind;
  storage_kind?: VfsStorageKind;
  r2_key?: string;
  mime_type?: string;
  size?: number;
  checksum?: string;
  version?: number;
  created_at: string;
  updated_at: string;
};

export type VfsFile = {
  path: string;
  content: string;
  mimeType?: string;
  size?: number;
  checksum?: string;
  version: number;
};

export type VfsSearchMatch = {
  path: string;
  kind: VfsEntryKind;
  line?: number;
  preview: string;
};

export function mapVfsEntry(row: VfsEntryRow): VfsEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    path: row.path,
    kind: row.kind,
    storageKind: row.storage_kind ?? (row.r2_key ? "legacy_r2" : "directory"),
    r2Key: row.r2_key,
    mimeType: row.mime_type,
    size: row.size,
    checksum: row.checksum,
    version: row.version ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
