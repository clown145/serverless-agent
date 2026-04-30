import { z } from "zod";

export const sendMessageInputSchema = z.object({
  platform: z.enum(["telegram", "qq", "webhook", "admin", "webui"]),
  conversationId: z.string().min(1),
  text: z.string().min(1).max(4096)
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const sendMessageInputJsonSchema = {
  type: "object",
  properties: {
    platform: {
      type: "string",
      enum: ["telegram", "qq", "webhook", "admin", "webui"],
      description: "Target platform for the outbound message."
    },
    conversationId: {
      type: "string",
      description: "Internal conversation id, such as telegram:123 or admin:default."
    },
    text: {
      type: "string",
      description: "Message text to send."
    }
  },
  required: ["platform", "conversationId", "text"],
  additionalProperties: false
} as const;
