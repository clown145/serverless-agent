import { createToolRegistry } from "../../tools/registry/tool-registry";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { createId } from "../../shared/ids";
import {
  listEmailMessageRecords,
  getEmailMessageRecord
} from "../../storage/repositories/email-messages-repository";
import { toEmailMessageDto } from "./platforms/email-dto";
import {
  adminForwardEmailSchema,
  adminReplyEmailSchema,
  adminSendEmailSchema,
  listEmailMessagesSchema,
  saveEmailAttachmentSchema,
  zodMessage
} from "./platforms/email-schemas";

export async function handleAdminEmailMessages(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }
  const parsed = listEmailMessagesSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return errorResponse(400, "invalid_query", zodMessage(parsed.error));
  }

  const messages = await listEmailMessageRecords(env.AGENT_DB, {
    agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    integrationId: parsed.data.integrationId,
    direction: parsed.data.direction,
    conversationId: parsed.data.conversationId,
    limit: parsed.data.limit
  });
  return jsonResponse({ ok: true, messages: messages.map(toEmailMessageDto) });
}

export async function handleAdminEmailMessageDetail(
  request: Request,
  env: Env,
  emailMessageId: string
): Promise<Response> {
  if (request.method !== "GET") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const message = await getEmailMessageRecord(env.AGENT_DB, emailMessageId);
  if (!message) {
    return errorResponse(404, "email_message_not_found", "Email message not found");
  }
  return jsonResponse({ ok: true, message: toEmailMessageDto(message) });
}

export async function handleAdminEmailSendAction(request: Request, env: Env): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const body = await request.json().catch(() => ({}));
  const action = pathname.endsWith("/reply")
    ? "email.reply"
    : pathname.endsWith("/forward")
      ? "email.forward"
      : "email.send";
  const schema =
    action === "email.reply"
      ? adminReplyEmailSchema
      : action === "email.forward"
        ? adminForwardEmailSchema
        : adminSendEmailSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const registry = createToolRegistry(env);
  const result = await registry.execute(action, {
    agentId: env.DEFAULT_AGENT_ID ?? "default",
    actorId: "admin",
    actorRole: "admin",
    platform: "admin",
    conversationId: "admin:email",
    runId: createId("run"),
    stepId: createId("step"),
    input: parsed.data
  });

  return jsonResponse(
    { ok: result.status === "success", result },
    { status: result.status === "failed" ? 500 : 200 }
  );
}

export async function handleAdminEmailAttachmentSave(
  request: Request,
  env: Env,
  input: { messageId: string; attachmentId: string }
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }
  const parsed = saveEmailAttachmentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const registry = createToolRegistry(env);
  const result = await registry.execute("email.save_attachment", {
    agentId: env.DEFAULT_AGENT_ID ?? "default",
    actorId: "admin",
    actorRole: "admin",
    platform: "admin",
    conversationId: "admin:email",
    runId: createId("run"),
    stepId: createId("step"),
    input: {
      messageId: input.messageId,
      attachmentId: input.attachmentId,
      path: parsed.data.path
    }
  });
  return jsonResponse(
    { ok: result.status === "success", result },
    { status: result.status === "failed" ? 500 : 200 }
  );
}
