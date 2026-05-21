import { z } from "zod";

export const platformSchema = z.enum(["telegram", "qq", "wecom", "webhook", "admin", "webui"]);

export const listConversationsQuerySchema = z.object({
  agentId: z.string().min(1).optional(),
  platform: platformSchema.optional(),
  rootConversationId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(80)
});

export const createConversationSchema = z.object({
  agentId: z.string().min(1).optional(),
  platform: platformSchema.default("webui"),
  conversationId: z.string().min(1).optional(),
  rootConversationId: z.string().min(1).optional(),
  title: z.string().max(120).optional()
});

export const updateConversationSchema = z.object({
  title: z.string().max(120).nullable().optional(),
  modelProviderId: z.string().min(1).nullable().optional(),
  modelId: z.string().min(1).nullable().optional(),
  historyLimit: z.number().int().min(4).max(80).optional(),
  summaryEnabled: z.boolean().optional(),
  summaryProviderId: z.string().min(1).nullable().optional(),
  summaryModelId: z.string().min(1).nullable().optional()
});

export const compactConversationSchema = z.object({
  agentId: z.string().min(1).optional()
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
