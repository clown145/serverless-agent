import { z } from "zod";

export const createMcpServerSchema = z.object({
  name: z.string().min(1).max(80),
  url: z.string().url(),
  authType: z.enum(["none", "bearer", "api-key-header"]).default("none"),
  authHeader: z.string().min(1).max(80).optional(),
  credential: z.string().min(1).optional()
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
