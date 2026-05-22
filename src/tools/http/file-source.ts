import { getMessageAttachmentRecord } from "../../storage/repositories/message-attachments-repository";
import { createVfsWorkspace } from "../../vfs/services/workspace-service";
import type { Env } from "../../shared/types/env";
import { validateFetchUrl } from "./url-safety";

export const MAX_HTTP_FILE_BYTES = 20 * 1024 * 1024;

export type HttpFileSourceInput =
  | {
      type: "vfs";
      path: string;
    }
  | {
      type: "attachment";
      messageId: string;
      attachmentId: string;
    }
  | {
      type: "url";
      url: string;
    }
  | {
      type: "base64";
      dataBase64: string;
    };

export type ResolvedHttpFile = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
};

type HttpFileSourceContext = {
  env: Env;
  agentId: string;
  actorId: string;
};

export async function resolveHttpFile(
  context: HttpFileSourceContext,
  source: HttpFileSourceInput,
  options: {
    fileName?: string;
    mimeType?: string;
  } = {}
): Promise<ResolvedHttpFile> {
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

    const object = await context.env.AGENT_BUCKET.get(attachment.r2Key);
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
        object.httpMetadata?.contentType ??
        "application/octet-stream"
    };
  }

  if (source.type === "base64") {
    const bytes = decodeBase64(source.dataBase64);
    ensureFileSize(bytes.byteLength);
    return {
      bytes,
      fileName: options.fileName ?? "file",
      mimeType: options.mimeType ?? "application/octet-stream"
    };
  }

  const validated = validateFetchUrl(source.url);
  if (validated) {
    throw new Error(validated);
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

export async function resolveHttpFileFromEnv(
  input: { env: Env; agentId: string },
  source: HttpFileSourceInput,
  options: {
    fileName?: string;
    mimeType?: string;
  } = {}
): Promise<ResolvedHttpFile> {
  return resolveHttpFile(
    {
      env: input.env,
      agentId: input.agentId,
      actorId: input.agentId
    },
    source,
    options
  );
}

function ensureFileSize(size: number): void {
  if (size > MAX_HTTP_FILE_BYTES) {
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

function decodeBase64(input: string): Uint8Array {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
