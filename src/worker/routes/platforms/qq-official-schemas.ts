import { z } from "zod";

export const createQqOfficialIntegrationSchema = z.object({
  agentId: z.string().min(1).optional(),
  name: z.string().min(1).max(80).default("QQ Official"),
  appId: z.string().min(1),
  secret: z.string().min(1).optional(),
  connectionMode: z.enum(["gateway", "webhook"]).default("gateway"),
  isSandbox: z.boolean().default(false),
  enableGroupC2c: z.boolean().default(true),
  enableGuildDirectMessage: z.boolean().default(true),
  enablePublicGuildMessages: z.boolean().default(true)
});

export const updateQqOfficialIntegrationSchema = z.object({
  agentId: z.string().min(1).optional(),
  name: z.string().min(1).max(80).optional(),
  appId: z.string().min(1).optional(),
  secret: z.string().min(1).optional(),
  connectionMode: z.enum(["gateway", "webhook"]).optional(),
  isSandbox: z.boolean().optional(),
  enableGroupC2c: z.boolean().optional(),
  enableGuildDirectMessage: z.boolean().optional(),
  enablePublicGuildMessages: z.boolean().optional()
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
