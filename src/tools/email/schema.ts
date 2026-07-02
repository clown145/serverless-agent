import { z } from "zod";
import { fileSourceJsonSchema, fileSourceSchema } from "../messaging/schema";

export const emailAddressSchema = z.object({
  address: z.string().email(),
  name: z.string().min(1).max(120).optional()
});

export const emailAttachmentInputSchema = z.object({
  source: fileSourceSchema,
  fileName: z.string().min(1).max(255).optional(),
  mimeType: z.string().min(1).max(120).optional()
});

export const sendEmailInputSchema = z
  .object({
    integrationId: z.string().min(1).optional(),
    to: z.array(emailAddressSchema).min(1).max(50),
    cc: z.array(emailAddressSchema).max(50).optional(),
    bcc: z.array(emailAddressSchema).max(50).optional(),
    replyTo: z.array(emailAddressSchema).max(10).optional(),
    subject: z.string().min(1).max(500),
    text: z.string().max(200_000).optional(),
    html: z.string().max(500_000).optional(),
    attachments: z.array(emailAttachmentInputSchema).max(20).optional()
  })
  .superRefine(requireTextOrHtml);

export const replyEmailInputSchema = z
  .object({
    emailMessageId: z.string().min(1),
    text: z.string().max(200_000).optional(),
    html: z.string().max(500_000).optional(),
    attachments: z.array(emailAttachmentInputSchema).max(20).optional()
  })
  .superRefine(requireTextOrHtml);

export const forwardEmailInputSchema = z.object({
  emailMessageId: z.string().min(1),
  to: z.array(emailAddressSchema).min(1).max(50),
  cc: z.array(emailAddressSchema).max(50).optional(),
  bcc: z.array(emailAddressSchema).max(50).optional(),
  mode: z.enum(["compose", "eml_attachment"]).default("compose"),
  text: z.string().max(200_000).optional(),
  html: z.string().max(500_000).optional(),
  includeOriginalAttachments: z.boolean().optional(),
  attachments: z.array(emailAttachmentInputSchema).max(20).optional()
});

export const listEmailMessagesInputSchema = z.object({
  integrationId: z.string().min(1).optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  conversationId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
});

export const getEmailMessageInputSchema = z.object({
  emailMessageId: z.string().min(1)
});

export const previewEmailAttachmentInputSchema = z.object({
  messageId: z.string().min(1),
  attachmentId: z.string().min(1),
  maxBytes: z.number().int().min(1).max(512_000).optional()
});

export const saveEmailAttachmentInputSchema = z.object({
  messageId: z.string().min(1),
  attachmentId: z.string().min(1),
  path: z.string().min(1)
});

export type SendEmailInput = z.infer<typeof sendEmailInputSchema>;
export type ReplyEmailInput = z.infer<typeof replyEmailInputSchema>;
export type ForwardEmailInput = z.infer<typeof forwardEmailInputSchema>;

const emailAddressJsonSchema = {
  type: "object",
  properties: {
    address: { type: "string", description: "Email address." },
    name: { type: "string", description: "Optional display name." }
  },
  required: ["address"],
  additionalProperties: false
} as const;

const attachmentJsonSchema = {
  type: "object",
  properties: {
    source: fileSourceJsonSchema,
    fileName: { type: "string" },
    mimeType: { type: "string" }
  },
  required: ["source"],
  additionalProperties: false
} as const;

export const sendEmailInputJsonSchema = {
  type: "object",
  properties: {
    integrationId: { type: "string", description: "Optional email integration id." },
    to: { type: "array", items: emailAddressJsonSchema, minItems: 1 },
    cc: { type: "array", items: emailAddressJsonSchema },
    bcc: { type: "array", items: emailAddressJsonSchema },
    replyTo: { type: "array", items: emailAddressJsonSchema },
    subject: { type: "string" },
    text: { type: "string" },
    html: { type: "string" },
    attachments: { type: "array", items: attachmentJsonSchema }
  },
  required: ["to", "subject"],
  additionalProperties: false
} as const;

export const replyEmailInputJsonSchema = {
  type: "object",
  properties: {
    emailMessageId: { type: "string" },
    text: { type: "string" },
    html: { type: "string" },
    attachments: { type: "array", items: attachmentJsonSchema }
  },
  required: ["emailMessageId"],
  additionalProperties: false
} as const;

export const forwardEmailInputJsonSchema = {
  type: "object",
  properties: {
    emailMessageId: { type: "string" },
    to: { type: "array", items: emailAddressJsonSchema, minItems: 1 },
    cc: { type: "array", items: emailAddressJsonSchema },
    bcc: { type: "array", items: emailAddressJsonSchema },
    mode: { type: "string", enum: ["compose", "eml_attachment"] },
    text: { type: "string" },
    html: { type: "string" },
    includeOriginalAttachments: { type: "boolean" },
    attachments: { type: "array", items: attachmentJsonSchema }
  },
  required: ["emailMessageId", "to"],
  additionalProperties: false
} as const;

export const listEmailMessagesInputJsonSchema = {
  type: "object",
  properties: {
    integrationId: { type: "string" },
    direction: { type: "string", enum: ["inbound", "outbound"] },
    conversationId: { type: "string" },
    limit: { type: "integer", minimum: 1, maximum: 100 }
  },
  additionalProperties: false
} as const;

export const getEmailMessageInputJsonSchema = {
  type: "object",
  properties: {
    emailMessageId: { type: "string" }
  },
  required: ["emailMessageId"],
  additionalProperties: false
} as const;

export const previewEmailAttachmentInputJsonSchema = {
  type: "object",
  properties: {
    messageId: { type: "string" },
    attachmentId: { type: "string" },
    maxBytes: { type: "integer", minimum: 1, maximum: 512000 }
  },
  required: ["messageId", "attachmentId"],
  additionalProperties: false
} as const;

export const saveEmailAttachmentInputJsonSchema = {
  type: "object",
  properties: {
    messageId: { type: "string" },
    attachmentId: { type: "string" },
    path: { type: "string" }
  },
  required: ["messageId", "attachmentId", "path"],
  additionalProperties: false
} as const;

function requireTextOrHtml(input: { text?: string; html?: string }, context: z.RefinementCtx): void {
  if (!input.text?.trim() && !input.html?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["text"],
      message: "Either text or html is required"
    });
  }
}
