export class VfsError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message);
    this.name = "VfsError";
  }
}

export function vfsNotFound(path: string): VfsError {
  return new VfsError(`VFS entry not found: ${path}`, "vfs_not_found");
}

export function vfsConflict(message: string): VfsError {
  return new VfsError(message, "vfs_conflict");
}

export function vfsInvalid(message: string): VfsError {
  return new VfsError(message, "vfs_invalid");
}
