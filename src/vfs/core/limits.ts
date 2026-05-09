export const VFS_D1_TEXT_LIMIT_BYTES = 256 * 1024;

export function shouldStoreTextInD1(sizeBytes: number): boolean {
  return sizeBytes <= VFS_D1_TEXT_LIMIT_BYTES;
}
