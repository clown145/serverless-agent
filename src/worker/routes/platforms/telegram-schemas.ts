import { z } from "zod";

export const createTelegramIntegrationSchema = z.object({
  agentId: z.string().min(1).optional(),
  name: z.string().min(1).max(80).default("Telegram"),
  botToken: z.string().min(1).optional(),
  webhookSecret: z.string().min(16).max(256).optional(),
  parseMode: z.enum(["none", "HTML", "MarkdownV2"]).default("HTML")
});

export const setTelegramWebhookSchema = z.object({
  webhookUrl: z.string().url().optional()
});

export const updateTelegramIntegrationSchema = z.object({
  agentId: z.string().min(1).optional(),
  name: z.string().min(1).max(80).optional(),
  botToken: z.string().min(1).optional(),
  webhookSecret: z.string().min(16).max(256).optional(),
  parseMode: z.enum(["none", "HTML", "MarkdownV2"]).optional()
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
