import { z } from "zod";

export const sendMessageInputSchema = z.object({
  platform: z.enum(["telegram", "qq", "webhook", "admin"]),
  conversationId: z.string().min(1),
  text: z.string().min(1).max(4096)
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;
