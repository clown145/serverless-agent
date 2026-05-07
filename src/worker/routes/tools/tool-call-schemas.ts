import { z } from "zod";

export const callToolSchema = z.object({
  toolName: z.string().min(1),
  input: z.unknown().default({}),
  agentId: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  actorRole: z.string().min(1).optional(),
  platform: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
  allowDangerous: z.boolean().default(false)
});

export const listToolCallsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
