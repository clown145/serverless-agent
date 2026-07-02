import { z } from "zod";

export const listDebugMessagesSchema = z.object({
  agentId: z.string().min(1).optional(),
  platform: z
    .enum(["telegram", "qq", "wecom", "weixin_oc", "webhook", "admin", "webui", "email"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
