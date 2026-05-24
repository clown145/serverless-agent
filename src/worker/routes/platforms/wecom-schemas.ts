import { z } from "zod";

export const createWecomIntegrationSchema = z.object({
  agentId: z.string().min(1).optional(),
  name: z.string().min(1).max(80).default("WeCom Customer Service"),
  corpId: z.string().min(1),
  secret: z.string().min(1).optional(),
  token: z.string().min(1).optional(),
  encodingAesKey: z.string().min(1).optional(),
  apiBaseUrl: z.url().default("https://qyapi.weixin.qq.com/cgi-bin/"),
  customerServiceName: z.string().min(1).optional(),
  openKfId: z.string().min(1).optional(),
  webhookSecret: z.string().min(16).max(256).optional()
});

export const updateWecomIntegrationSchema = z.object({
  agentId: z.string().min(1).optional(),
  name: z.string().min(1).max(80).optional(),
  corpId: z.string().min(1).optional(),
  secret: z.string().min(1).optional(),
  token: z.string().min(1).optional(),
  encodingAesKey: z.string().min(1).optional(),
  apiBaseUrl: z.url().optional(),
  customerServiceName: z.string().min(1).optional(),
  openKfId: z.string().min(1).optional(),
  webhookSecret: z.string().min(16).max(256).optional()
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
