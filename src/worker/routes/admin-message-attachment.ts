import { errorResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { createBlobStorage } from "../../storage/blob";
import { getMessageAttachmentRecord } from "../../storage/repositories/message-attachments-repository";

export async function handleAdminMessageAttachment(
  request: Request,
  env: Env,
  input: {
    messageId: string;
    attachmentId: string;
  }
): Promise<Response> {
  if (request.method !== "GET") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const attachment = await getMessageAttachmentRecord(env.AGENT_DB, input);
  if (!attachment?.r2Key) {
    return errorResponse(404, "attachment_not_found", "Attachment not found");
  }

  const object = await createBlobStorage(env).get(attachment.r2Key);
  if (!object) {
    return errorResponse(404, "attachment_object_not_found", "Attachment object not found");
  }

  return new Response(object.body, {
    headers: {
      "content-type": attachment.mimeType ?? object.contentType ?? "application/octet-stream",
      "cache-control": "private, max-age=300"
    }
  });
}
