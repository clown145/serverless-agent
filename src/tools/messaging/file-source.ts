import { getMessageAttachmentRecord } from "../../storage/repositories/message-attachments-repository";
import { createVfsWorkspace } from "../../vfs/services/workspace-service";
import type { OutboundFile } from "../../platforms/outbound/types";
import type { ToolExecutionContext } from "../types";
import type { FileSourceInput } from "./schema";
import { createBlobStorage } from "../../storage/blob";

const MAX_OUTBOUND_FILE_BYTES = 20 * 1024 * 1024;

export async function resolveOutboundFile(
  context: ToolExecutionContext,
  source: FileSourceInput,
  options: {
    fileName?: string;
    mimeType?: string;
  } = {}
): Promise<OutboundFile> {
  if (source.type === "vfs") {
    const workspace = createVfsWorkspace(context);
    const file = await workspace.readFile(source.path);
    const bytes = new TextEncoder().encode(file.content);
    ensureFileSize(bytes.byteLength);
    return {
      bytes,
      fileName: options.fileName ?? nameFromPath(file.path),
      mimeType: options.mimeType ?? file.mimeType ?? "text/plain; charset=utf-8"
    };
  }

  if (source.type === "attachment") {
    const attachment = await getMessageAttachmentRecord(context.env.AGENT_DB, {
      messageId: source.messageId,
      attachmentId: source.attachmentId
    });
    if (!attachment || attachment.agentId !== context.agentId || !attachment.r2Key) {
      throw new Error("Attachment not found");
    }

    const object = await createBlobStorage(context.env).get(attachment.r2Key);
    if (!object) {
      throw new Error("Attachment object not found");
    }

    const bytes = new Uint8Array(await object.arrayBuffer());
    ensureFileSize(bytes.byteLength);
    return {
      bytes,
      fileName: options.fileName ?? attachment.name ?? `${attachment.id}.bin`,
      mimeType:
        options.mimeType ??
        attachment.mimeType ??
        object.contentType ??
        "application/octet-stream"
    };
  }

  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`File URL fetch failed: ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  ensureFileSize(bytes.byteLength);
  return {
    bytes,
    fileName: options.fileName ?? nameFromUrl(source.url),
    mimeType:
      options.mimeType ??
      response.headers.get("content-type") ??
      "application/octet-stream"
  };
}

function ensureFileSize(size: number): void {
  if (size > MAX_OUTBOUND_FILE_BYTES) {
    throw new Error("File is too large to send");
  }
}

function nameFromPath(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? "file.txt";
}

function nameFromUrl(url: string): string {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "file";
  } catch {
    return "file";
  }
}
