import { createToolRegistry } from "../../tools/registry/tool-registry";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { createId } from "../../shared/ids";
import {
  listEmailMessageRecords,
  getEmailMessageRecord
} from "../../storage/repositories/email-messages-repository";
import { getMessageAttachmentRecord } from "../../storage/repositories/message-attachments-repository";
import { getPlatformIntegrationRecord } from "../../storage/repositories/platform-integrations-repository";
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

  const listTarget = await resolveEmailListTarget(env, parsed.data);
  if (listTarget instanceof Response) {
    return listTarget;
  }

  const messages = await listEmailMessageRecords(env.AGENT_DB, {
    agentId: listTarget.agentId,
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
  const target = await resolveEmailActionTarget(env, action, parsed.data);
  if (target instanceof Response) {
    return target;
  }
  const result = await registry.execute(action, {
    agentId: target.agentId,
    actorId: "admin",
    actorRole: "admin",
    platform: "admin",
    conversationId: target.conversationId,
    runId: createId("run"),
    stepId: createId("step"),
    input: parsed.data
  });

  return jsonResponse(
    { ok: result.status === "success", result },
    { status: emailToolHttpStatus(result.status) }
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

  const attachment = await getMessageAttachmentRecord(env.AGENT_DB, input);
  if (!attachment) {
    return errorResponse(404, "attachment_not_found", "Attachment not found");
  }

  const registry = createToolRegistry(env);
  const result = await registry.execute("email.save_attachment", {
    agentId: attachment.agentId,
    actorId: "admin",
    actorRole: "admin",
    platform: "admin",
    conversationId: attachment.conversationId,
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
    { status: emailToolHttpStatus(result.status) }
  );
}

type EmailAction = "email.send" | "email.reply" | "email.forward";

async function resolveEmailListTarget(
  env: Env,
  input: { agentId?: string; integrationId?: string }
): Promise<{ agentId: string } | Response> {
  if (!input.integrationId) {
    return { agentId: input.agentId ?? env.DEFAULT_AGENT_ID ?? "default" };
  }

  const integration = await getPlatformIntegrationRecord(env.AGENT_DB, input.integrationId);
  if (!integration || integration.platform !== "email") {
    return errorResponse(404, "email_integration_not_found", "Email integration not found");
  }
  if (input.agentId && input.agentId !== integration.agentId) {
    return errorResponse(
      400,
      "email_integration_agent_mismatch",
      "Email integration does not belong to the requested agent"
    );
  }
  return { agentId: integration.agentId };
}

async function resolveEmailActionTarget(
  env: Env,
  action: EmailAction,
  input: unknown
): Promise<{ agentId: string; conversationId?: string } | Response> {
  if (action === "email.reply" || action === "email.forward") {
    const emailMessageId = (input as { emailMessageId?: string }).emailMessageId;
    if (!emailMessageId) {
      return errorResponse(400, "invalid_payload", "emailMessageId is required");
    }
    const message = await getEmailMessageRecord(env.AGENT_DB, emailMessageId);
    if (!message) {
      return errorResponse(404, "email_message_not_found", "Email message not found");
    }
    return { agentId: message.agentId, conversationId: message.conversationId };
  }

  const integrationId = (input as { integrationId?: string }).integrationId;
  if (integrationId) {
    const integration = await getPlatformIntegrationRecord(env.AGENT_DB, integrationId);
    if (!integration || integration.platform !== "email") {
      return errorResponse(404, "email_integration_not_found", "Email integration not found");
    }
    return {
      agentId: integration.agentId,
      conversationId: `email:${integration.id}:outbound`
    };
  }

  return { agentId: env.DEFAULT_AGENT_ID ?? "default" };
}

function emailToolHttpStatus(status: string): number {
  if (status === "failed") {
    return 500;
  }
  if (status === "permission_denied") {
    return 403;
  }
  if (status === "needs_confirmation") {
    return 202;
  }
  return 200;
}
