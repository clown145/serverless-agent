export type EmailAttachmentPreviewKind = "text" | "image" | "pdf" | "download";

export function isTextEmailMime(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return (
    normalized.startsWith("text/") ||
    normalized === "application/json" ||
    normalized.endsWith("+json")
  );
}

export function emailAttachmentPreviewKind(mimeType: string): EmailAttachmentPreviewKind {
  const normalized = normalizeMimeType(mimeType);
  if (isTextEmailMime(normalized)) {
    return "text";
  }
  if (normalized.startsWith("image/")) {
    return "image";
  }
  if (normalized === "application/pdf") {
    return "pdf";
  }
  return "download";
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}
