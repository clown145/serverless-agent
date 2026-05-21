import { z } from "zod";

export const listMessagesSchema = z.object({
  agentId: z.string().min(1).optional(),
  conversationId: z.string().min(1).default("webui:default"),
  platform: z.enum(["telegram", "qq", "wecom", "webhook", "admin", "webui"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
