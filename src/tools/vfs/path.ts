export function normalizeVfsPath(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("VFS path must start with /");
  }

  if (path.includes("\0")) {
    throw new Error("VFS path cannot contain null bytes");
  }

  const parts = path.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) {
    throw new Error("VFS path cannot contain . or .. segments");
  }

  return `/${parts.join("/")}`;
}

export function parentPath(path: string): string {
  const normalized = normalizeVfsPath(path);
  const index = normalized.lastIndexOf("/");

  if (index <= 0) {
    return "/";
  }

  return normalized.slice(0, index);
}
