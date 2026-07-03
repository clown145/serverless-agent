import { z } from "zod";
import {
  forwardEmailInputSchema,
  replyEmailInputSchema,
  sendEmailInputSchema
} from "../../../tools/email/schema";

export const createEmailIntegrationSchema = z.object({
  agentId: z.string().min(1).optional(),
  name: z.string().min(1).max(80).default("Email"),
  fromAddress: z.string().email(),
  fromName: z.string().min(1).max(120).optional(),
  replyTo: z.string().email().optional(),
  inboundAddresses: z.array(z.string().email()).min(1).max(20),
  resendApiKey: z.string().min(1).optional()
});

export const updateEmailIntegrationSchema = createEmailIntegrationSchema.partial().extend({
  resendApiKey: z.string().min(1).optional()
});

export const listEmailMessagesSchema = z.object({
  agentId: z.string().min(1).optional(),
  integrationId: z.string().min(1).optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  conversationId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const adminSendEmailSchema = sendEmailInputSchema;
export const adminReplyEmailSchema = replyEmailInputSchema;
export const adminForwardEmailSchema = forwardEmailInputSchema;

export const saveEmailAttachmentSchema = z.object({
  path: z.string().min(1)
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
