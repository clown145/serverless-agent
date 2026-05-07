import { z } from "zod";

export const updateMcpToolStatusSchema = z.object({
  status: z.enum(["available", "enabled", "disabled"])
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
