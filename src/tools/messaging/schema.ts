import { z } from "zod";

export const messagingPlatformSchema = z.enum(["telegram", "qq", "webhook", "admin", "webui"]);

export const sendMessageInputSchema = z.object({
  platform: messagingPlatformSchema,
  conversationId: z.string().min(1),
  text: z.string().min(1).max(4096)
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const fileSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("vfs"),
    path: z.string().min(1)
  }),
  z.object({
    type: z.literal("attachment"),
    messageId: z.string().min(1),
    attachmentId: z.string().min(1)
  }),
  z.object({
    type: z.literal("url"),
    url: z.url()
  })
]);

export type FileSourceInput = z.infer<typeof fileSourceSchema>;

export const sendFileInputSchema = z.object({
  platform: messagingPlatformSchema,
  conversationId: z.string().min(1),
  source: fileSourceSchema,
  caption: z.string().min(1).max(1024).optional(),
  fileName: z.string().min(1).max(255).optional(),
  mimeType: z.string().min(1).max(120).optional()
});

export type SendFileInput = z.infer<typeof sendFileInputSchema>;

export const sendImageInputSchema = sendFileInputSchema;

export type SendImageInput = z.infer<typeof sendImageInputSchema>;

export const buttonActionSchema = z.enum([
  "agent.message",
  "pending.confirm",
  "pending.reject"
]);

const buttonSchema = z.object({
  label: z.string().min(1).max(64),
  action: buttonActionSchema,
  payload: z.record(z.string(), z.unknown()).optional()
});

export const buttonLayoutSchema = z.object({
  columns: z.number().int().min(1).max(4).default(1)
});

export const sendButtonsInputSchema = z.object({
  platform: messagingPlatformSchema,
  conversationId: z.string().min(1),
  text: z.string().min(1).max(4096),
  buttons: z.preprocess(
    parseJsonString,
    z.array(buttonSchema).min(1).max(12)
  ),
  layout: buttonLayoutSchema.optional(),
  expiresInSeconds: z.number().int().min(60).max(86_400).optional()
});

export type SendButtonsInput = z.infer<typeof sendButtonsInputSchema>;

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

export const fileSourceJsonSchema = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["vfs", "attachment", "url"],
      description: "File source type."
    },
    path: {
      type: "string",
      description: "VFS path when type is vfs."
    },
    messageId: {
      type: "string",
      description: "Message id when type is attachment."
    },
    attachmentId: {
      type: "string",
      description: "Attachment id when type is attachment."
    },
    url: {
      type: "string",
      description: "Public URL when type is url."
    }
  },
  required: ["type"],
  additionalProperties: false,
  examples: [
    {
      type: "vfs",
      path: "/workspace/report.md"
    },
    {
      type: "attachment",
      messageId: "msg_...",
      attachmentId: "tg_..."
    },
    {
      type: "url",
      url: "https://example.com/file.png"
    }
  ]
} as const;

export const sendFileInputJsonSchema = {
  type: "object",
  properties: {
    platform: {
      type: "string",
      enum: ["telegram", "qq", "webhook", "admin", "webui"],
      description: "Target platform for the outbound file."
    },
    conversationId: {
      type: "string",
      description: "Internal conversation id, such as telegram:123 or admin:default."
    },
    source: fileSourceJsonSchema,
    caption: {
      type: "string",
      description: "Optional file caption."
    },
    fileName: {
      type: "string",
      description: "Optional outgoing file name override."
    },
    mimeType: {
      type: "string",
      description: "Optional outgoing MIME type override."
    }
  },
  required: ["platform", "conversationId", "source"],
  additionalProperties: false
} as const;

export const sendImageInputJsonSchema = sendFileInputJsonSchema;

export const sendButtonsInputJsonSchema = {
  type: "object",
  properties: {
    platform: {
      type: "string",
      enum: ["telegram", "qq", "webhook", "admin", "webui"],
      description: "Target platform for the outbound buttons."
    },
    conversationId: {
      type: "string",
      description: "Internal conversation id, such as telegram:123 or admin:default."
    },
    text: {
      type: "string",
      description: "Message text shown above the buttons."
    },
    buttons: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          label: {
            type: "string",
            description: "Button label."
          },
          action: {
            type: "string",
            enum: ["agent.message", "pending.confirm", "pending.reject"],
            description: "Callback action."
          },
          payload: {
            type: "object",
            description: "Small callback payload stored server-side."
          }
        },
        required: ["label", "action"],
        additionalProperties: false
      }
    },
    layout: {
      type: "object",
      properties: {
        columns: {
          type: "integer",
          minimum: 1,
          maximum: 4,
          description: "Number of buttons per row."
        }
      },
      additionalProperties: false
    },
    expiresInSeconds: {
      type: "integer",
      minimum: 60,
      maximum: 86400,
      description: "Callback expiry in seconds."
    }
  },
  required: ["platform", "conversationId", "text", "buttons"],
  additionalProperties: false
} as const;

function parseJsonString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
