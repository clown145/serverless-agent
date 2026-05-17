import { z } from "zod";

export const createQqIntegrationSchema = z.object({
  agentId: z.string().min(1).optional(),
  name: z.string().min(1).max(80).default("QQ"),
  appId: z.string().min(1),
  appSecret: z.string().min(1),
  webhookSecret: z.string().min(16).max(256).optional(),
  environment: z.enum(["sandbox", "production"]).default("sandbox")
});

export const updateQqIntegrationSchema = z.object({
  environment: z.enum(["sandbox", "production"]).optional()
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
