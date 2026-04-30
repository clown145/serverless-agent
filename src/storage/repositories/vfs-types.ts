export type VfsEntry = {
  id: string;
  agentId: string;
  path: string;
  kind: "file" | "directory";
  r2Key?: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
  updatedAt: string;
};

export type VfsEntryRow = {
  id: string;
  agent_id: string;
  path: string;
  kind: "file" | "directory";
  r2_key?: string;
  mime_type?: string;
  size?: number;
  created_at: string;
  updated_at: string;
};

export function mapVfsEntry(row: VfsEntryRow): VfsEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    path: row.path,
    kind: row.kind,
    r2Key: row.r2_key,
    mimeType: row.mime_type,
    size: row.size,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
