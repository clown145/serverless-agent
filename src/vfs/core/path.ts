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

export function resolveVfsPath(cwd: string, path: string): string {
  if (path.includes("\0")) {
    throw new Error("VFS path cannot contain null bytes");
  }

  const baseParts = path.startsWith("/")
    ? []
    : normalizeVfsPath(cwd).split("/").filter(Boolean);

  for (const part of path.split("/")) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      baseParts.pop();
      continue;
    }

    baseParts.push(part);
  }

  return `/${baseParts.join("/")}`;
}

export function parentPath(path: string): string {
  const normalized = normalizeVfsPath(path);
  const index = normalized.lastIndexOf("/");

  if (index <= 0) {
    return "/";
  }

  return normalized.slice(0, index);
}

export function childName(path: string): string {
  const normalized = normalizeVfsPath(path);
  if (normalized === "/") {
    return "/";
  }

  return normalized.slice(normalized.lastIndexOf("/") + 1);
}

export function isRootPath(path: string): boolean {
  return normalizeVfsPath(path) === "/";
}

export function isDescendantPath(path: string, parent: string): boolean {
  const normalized = normalizeVfsPath(path);
  const normalizedParent = normalizeVfsPath(parent);
  return (
    normalizedParent !== "/" &&
    normalized.startsWith(`${normalizedParent}/`)
  );
}
