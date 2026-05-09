export const VFS_ENTRY_COLUMNS =
  "id, agent_id, path, kind, storage_kind, r2_key, mime_type, size, checksum, version, created_at, updated_at";

export function escapeSqlLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
