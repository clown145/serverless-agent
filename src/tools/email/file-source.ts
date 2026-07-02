import { createBlobStorage } from "../../storage/blob";
import { getMessageAttachmentRecord } from "../../storage/repositories/message-attachments-repository";
import { createVfsWorkspace } from "../../vfs/services/workspace-service";
import { resolveOutboundFile } from "../messaging/file-source";
import type { FileSourceInput } from "../messaging/schema";
import type { ToolExecutionContext } from "../types";
import type { ResendAttachmentInput } from "../../adapters/email/resend";

export async function resolveEmailAttachment(
  context: ToolExecutionContext,
  input: {
    source: FileSourceInput;
    fileName?: string;
    mimeType?: string;
  }
): Promise<ResendAttachmentInput> {
  const file = await resolveOutboundFile(context, input.source, {
    fileName: input.fileName,
    mimeType: input.mimeType
  });
  return {
    filename: file.fileName,
    contentType: file.mimeType,
    bytes: file.bytes
  };
}

export async function resolveMessageAttachmentBytes(
  context: Pick<ToolExecutionContext, "env" | "agentId">,
  input: { messageId: string; attachmentId: string }
): Promise<{
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  size: number;
}> {
  const attachment = await getMessageAttachmentRecord(context.env.AGENT_DB, input);
  if (!attachment || attachment.agentId !== context.agentId || !attachment.r2Key) {
    throw new Error("Attachment not found");
  }

  const object = await createBlobStorage(context.env).get(attachment.r2Key);
  if (!object) {
    throw new Error("Attachment object not found");
  }

  const bytes = new Uint8Array(await object.arrayBuffer());
  return {
    bytes,
    fileName: attachment.name ?? `${attachment.id}.bin`,
    mimeType: attachment.mimeType ?? object.contentType ?? "application/octet-stream",
    size: bytes.byteLength
  };
}

export async function saveAttachmentToVfs(
  context: ToolExecutionContext,
  input: { messageId: string; attachmentId: string; path: string }
) {
  const attachment = await resolveMessageAttachmentBytes(context, input);
  const workspace = createVfsWorkspace(context);
  return workspace.writeBinaryFile({
    path: input.path,
    bytes: attachment.bytes,
    mimeType: attachment.mimeType
  });
}
