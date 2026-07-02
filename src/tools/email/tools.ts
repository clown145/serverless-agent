import { formatAddress, sendResendEmail, type ResendAttachmentInput } from "../../adapters/email/resend";
import {
  resolveDefaultEmailIntegration,
  resolveEmailIntegrationById
} from "../../adapters/email/config";
import { createBlobStorage } from "../../storage/blob";
import {
  createEmailMessageRecord,
  getEmailMessageRecord,
  listEmailMessageRecords,
  updateEmailMessageDelivery
} from "../../storage/repositories/email-messages-repository";
import { listMessageAttachments } from "../../storage/repositories/message-attachments-repository";
import { nowIso } from "../../shared/time";
import { builtinTool } from "../builtin/source";
import type { RegisteredTool, ToolExecutionContext, ToolResult } from "../types";
import { failed } from "../vfs/result";
import {
  resolveEmailAttachment,
  resolveMessageAttachmentBytes,
  saveAttachmentToVfs
} from "./file-source";
import {
  forwardEmailInputJsonSchema,
  forwardEmailInputSchema,
  getEmailMessageInputJsonSchema,
  getEmailMessageInputSchema,
  listEmailMessagesInputJsonSchema,
  listEmailMessagesInputSchema,
  previewEmailAttachmentInputJsonSchema,
  previewEmailAttachmentInputSchema,
  replyEmailInputJsonSchema,
  replyEmailInputSchema,
  saveEmailAttachmentInputJsonSchema,
  saveEmailAttachmentInputSchema,
  sendEmailInputJsonSchema,
  sendEmailInputSchema,
  type ForwardEmailInput,
  type SendEmailInput
} from "./schema";

export function createEmailTools(): RegisteredTool[] {
  return [
    sendEmailTool(),
    replyEmailTool(),
    forwardEmailTool(),
    listEmailMessagesTool(),
    getEmailMessageTool(),
    previewEmailAttachmentTool(),
    saveEmailAttachmentTool()
  ];
}

function sendEmailTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "email.send",
      title: "Send Email",
      description: "Send a new email through the configured Resend integration.",
      inputSchema: sendEmailInputJsonSchema,
      annotations: { destructiveHint: false, openWorldHint: true },
      permission: { level: 4, scopes: ["email:send"], confirmationRequired: true },
      behavior: { preventsFinalResponse: true },
      sideEffect: "external_write",
      timeoutMs: 30_000
    },
    execute: async (context) => {
      const parsed = sendEmailInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }
      return sendEmail(context, parsed.data);
    }
  });
}

function replyEmailTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "email.reply",
      title: "Reply Email",
      description: "Reply to an inbound email through Resend with reply headers.",
      inputSchema: replyEmailInputJsonSchema,
      annotations: { destructiveHint: false, openWorldHint: true },
      permission: { level: 4, scopes: ["email:send"], confirmationRequired: true },
      behavior: { preventsFinalResponse: true },
      sideEffect: "external_write",
      timeoutMs: 30_000
    },
    execute: async (context) => {
      const parsed = replyEmailInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const original = await requireEmailMessage(context, parsed.data.emailMessageId);
      const to = original.replyTo.length ? original.replyTo : [original.from];
      const references = [...original.references, original.rfcMessageId].filter(
        (value): value is string => Boolean(value)
      );
      return sendEmail(context, {
        integrationId: original.integrationId,
        to,
        subject: replySubject(original.subject),
        text: parsed.data.text,
        html: parsed.data.html,
        attachments: parsed.data.attachments
      }, {
        conversationId: original.conversationId,
        threadKey: original.threadKey,
        inReplyTo: original.rfcMessageId,
        references,
        headers: {
          ...(original.rfcMessageId ? { "In-Reply-To": original.rfcMessageId } : {}),
          References: references.join(" ")
        }
      });
    }
  });
}

function forwardEmailTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "email.forward",
      title: "Forward Email",
      description: "Forward an email either as a composed message or as a raw .eml attachment.",
      inputSchema: forwardEmailInputJsonSchema,
      annotations: { destructiveHint: false, openWorldHint: true },
      permission: { level: 4, scopes: ["email:send"], confirmationRequired: true },
      behavior: { preventsFinalResponse: true },
      sideEffect: "external_write",
      timeoutMs: 30_000
    },
    execute: async (context) => {
      const parsed = forwardEmailInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const original = await requireEmailMessage(context, parsed.data.emailMessageId);
      return sendForward(context, parsed.data, original);
    }
  });
}

function listEmailMessagesTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "email.list_messages",
      title: "List Email Messages",
      description: "List indexed email messages for this agent.",
      inputSchema: listEmailMessagesInputJsonSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
      permission: { level: 1, scopes: ["email:read"] },
      sideEffect: "none",
      timeoutMs: 5_000
    },
    execute: async (context) => {
      const parsed = listEmailMessagesInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }
      const messages = await listEmailMessageRecords(context.env.AGENT_DB, {
        agentId: context.agentId,
        ...parsed.data
      });
      return { status: "success", output: { messages } };
    }
  });
}

function getEmailMessageTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "email.get_message",
      title: "Get Email Message",
      description: "Get a stored email message by id.",
      inputSchema: getEmailMessageInputJsonSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
      permission: { level: 1, scopes: ["email:read"] },
      sideEffect: "none",
      timeoutMs: 5_000
    },
    execute: async (context) => {
      const parsed = getEmailMessageInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }
      const message = await requireEmailMessage(context, parsed.data.emailMessageId);
      return { status: "success", output: { message } };
    }
  });
}

function previewEmailAttachmentTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "email.preview_attachment",
      title: "Preview Email Attachment",
      description: "Preview text attachments and return metadata for images, PDFs, and other files.",
      inputSchema: previewEmailAttachmentInputJsonSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
      permission: { level: 1, scopes: ["email:read"] },
      sideEffect: "none",
      timeoutMs: 8_000
    },
    execute: async (context) => {
      const parsed = previewEmailAttachmentInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }
      const attachment = await resolveMessageAttachmentBytes(context, parsed.data);
      const maxBytes = parsed.data.maxBytes ?? 64_000;
      const textPreview = isTextMime(attachment.mimeType)
        ? new TextDecoder().decode(attachment.bytes.slice(0, maxBytes))
        : undefined;
      return {
        status: "success",
        output: {
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          size: attachment.size,
          previewKind: previewKind(attachment.mimeType),
          textPreview,
          truncated: Boolean(textPreview && attachment.bytes.byteLength > maxBytes)
        }
      };
    }
  });
}

function saveEmailAttachmentTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "email.save_attachment",
      title: "Save Email Attachment",
      description: "Save an email attachment to the agent VFS while preserving binary bytes.",
      inputSchema: saveEmailAttachmentInputJsonSchema,
      annotations: { destructiveHint: false, openWorldHint: false },
      permission: { level: 2, scopes: ["email:read", "workspace:write"] },
      sideEffect: "workspace_write",
      timeoutMs: 10_000
    },
    execute: async (context) => {
      const parsed = saveEmailAttachmentInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }
      const entry = await saveAttachmentToVfs(context, parsed.data);
      return { status: "success", output: { entry } };
    }
  });
}

async function sendEmail(
  context: ToolExecutionContext,
  input: SendEmailInput,
  options: {
    conversationId?: string;
    threadKey?: string;
    inReplyTo?: string;
    references?: string[];
    headers?: Record<string, string>;
    extraAttachments?: ResendAttachmentInput[];
  } = {}
): Promise<ToolResult> {
  const resolved = input.integrationId
    ? await resolveEmailIntegrationById(context.env, input.integrationId)
    : await resolveDefaultEmailIntegration(context.env, context.agentId);
  const attachments = [
    ...(await resolveEmailAttachments(context, input.attachments)),
    ...(options.extraAttachments ?? [])
  ];
  const replyTo = input.replyTo?.length
    ? input.replyTo
    : resolved.config.replyTo
      ? [{ address: resolved.config.replyTo }]
      : [];
  const from = formatAddress({
    address: resolved.config.fromAddress,
    name: resolved.config.fromName
  });
  const sentAt = nowIso();
  const conversationId =
    options.conversationId ?? context.conversationId ?? `email:${resolved.integration.id}:outbound`;
  const threadKey = options.threadKey ?? `outbound:${crypto.randomUUID()}`;
  const record = await createEmailMessageRecord(context.env.AGENT_DB, {
    agentId: context.agentId,
    integrationId: resolved.integration.id,
    direction: "outbound",
    conversationId,
    threadKey,
    from: { address: resolved.config.fromAddress, name: resolved.config.fromName },
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    replyTo,
    subject: input.subject,
    textBody: input.text,
    htmlBody: input.html,
    headers: options.headers,
    inReplyTo: options.inReplyTo,
    references: options.references,
    status: "queued",
    sentAt
  });

  try {
    const result = await sendResendEmail({
      apiKey: resolved.resendApiKey,
      from,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: options.headers,
      attachments
    });
    const updated = await updateEmailMessageDelivery(context.env.AGENT_DB, record.id, {
      status: "sent",
      resendMessageId: result.id,
      sentAt
    });
    return { status: "success", output: { message: updated, resendMessageId: result.id } };
  } catch (error) {
    await updateEmailMessageDelivery(context.env.AGENT_DB, record.id, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error)
    });
    return failed("email_send_failed", error instanceof Error ? error.message : "Email send failed", true);
  }
}

async function sendForward(
  context: ToolExecutionContext,
  input: ForwardEmailInput,
  original: Awaited<ReturnType<typeof requireEmailMessage>>
): Promise<ToolResult> {
  const attachments = [...(input.attachments ?? [])];
  const extraAttachments: ResendAttachmentInput[] = [];

  if (input.includeOriginalAttachments && original.internalMessageId) {
    const originalAttachments = await listMessageAttachments(context.env.AGENT_DB, [
      original.internalMessageId
    ]);
    for (const attachment of originalAttachments) {
      const resolved = await resolveMessageAttachmentBytes(context, {
        messageId: attachment.messageId,
        attachmentId: attachment.id
      });
      extraAttachments.push({
        filename: resolved.fileName,
        contentType: resolved.mimeType,
        bytes: resolved.bytes
      });
    }
  }

  if (input.mode === "eml_attachment" && original.rawR2Key) {
    const object = await createBlobStorage(context.env).get(original.rawR2Key);
    if (!object) {
      return failed("raw_email_not_found", "Original raw email object not found", false);
    }
    extraAttachments.push({
      filename: `${safeSubject(original.subject)}.eml`,
      contentType: "message/rfc822",
      bytes: new Uint8Array(await object.arrayBuffer())
    });
  }

  const text = input.text ?? createForwardText(original);
  const result = await sendEmail(context, {
    integrationId: original.integrationId,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: forwardSubject(original.subject),
    text,
    html: input.html,
    attachments
  }, {
    conversationId: original.conversationId,
    threadKey: original.threadKey,
    extraAttachments
  });
  return result;
}

async function resolveEmailAttachments(
  context: ToolExecutionContext,
  attachments: SendEmailInput["attachments"]
): Promise<ResendAttachmentInput[]> {
  const resolved = [];
  for (const attachment of attachments ?? []) {
    resolved.push(await resolveEmailAttachment(context, attachment));
  }
  return resolved;
}

async function requireEmailMessage(context: Pick<ToolExecutionContext, "env" | "agentId">, id: string) {
  const message = await getEmailMessageRecord(context.env.AGENT_DB, id);
  if (!message || message.agentId !== context.agentId) {
    throw new Error("Email message not found");
  }
  return message;
}

function replySubject(subject: string | undefined): string {
  const value = subject?.trim() || "(no subject)";
  return /^re:/i.test(value) ? value : `Re: ${value}`;
}

function forwardSubject(subject: string | undefined): string {
  const value = subject?.trim() || "(no subject)";
  return /^fwd?:/i.test(value) ? value : `Fwd: ${value}`;
}

function createForwardText(original: Awaited<ReturnType<typeof requireEmailMessage>>): string {
  return [
    "",
    "---------- Forwarded message ---------",
    `From: ${formatAddress(original.from)}`,
    original.subject ? `Subject: ${original.subject}` : "Subject: (no subject)",
    `To: ${original.to.map(formatAddress).join(", ")}`,
    "",
    original.textBody ?? original.snippet ?? ""
  ].join("\n");
}

function isTextMime(mimeType: string): boolean {
  return mimeType.startsWith("text/") || mimeType === "application/json" || mimeType.endsWith("+json");
}

function previewKind(mimeType: string): "text" | "image" | "pdf" | "download" {
  if (isTextMime(mimeType)) {
    return "text";
  }
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  return "download";
}

function safeSubject(subject: string | undefined): string {
  return (subject?.trim() || "forwarded-email").replace(/[^\w.-]+/g, "_").slice(0, 80);
}
