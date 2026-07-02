import { z } from "zod";

export const messagingPlatformSchema = z.enum([
  "telegram",
  "qq",
  "wecom",
  "weixin_oc",
  "webhook",
  "admin",
  "webui"
]);

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

export const currentConversationFileInputSchema = z.object({
  source: fileSourceSchema,
  caption: z.string().min(1).max(1024).optional(),
  fileName: z.string().min(1).max(255).optional(),
  mimeType: z.string().min(1).max(120).optional()
});

export type CurrentConversationFileInput = z.infer<typeof currentConversationFileInputSchema>;

export const buttonActionSchema = z.enum(["agent.message", "pending.confirm", "pending.reject"]);

const buttonLabelShape = {
  label: z.string().min(1).max(64).optional(),
  text: z.string().min(1).max(64).optional()
};

const callbackButtonSchema = z
  .object({
    kind: z.literal("callback").optional(),
    ...buttonLabelShape,
    action: buttonActionSchema,
    payload: z.record(z.string(), z.unknown()).optional(),
    reuse: z.boolean().optional(),
    answerText: z.string().min(1).max(200).optional(),
    showAlert: z.boolean().optional(),
    removeKeyboardOnClick: z.boolean().optional(),
    editMessageText: z.string().min(1).max(4096).optional(),
    silent: z.boolean().optional()
  })
  .superRefine(requireButtonLabel)
  .transform((button) => ({
    kind: "callback" as const,
    label: button.label ?? button.text ?? "",
    action: button.action,
    payload: button.payload,
    reuse: button.reuse,
    answerText: button.answerText,
    showAlert: button.showAlert,
    removeKeyboardOnClick: button.removeKeyboardOnClick,
    editMessageText: button.editMessageText,
    silent: button.silent
  }));

const urlButtonSchema = z
  .object({
    kind: z.literal("url"),
    ...buttonLabelShape,
    url: z.string().url()
  })
  .superRefine(requireButtonLabel)
  .transform((button) => ({
    kind: "url" as const,
    label: button.label ?? button.text ?? "",
    url: button.url
  }));

const webAppButtonSchema = z
  .object({
    kind: z.literal("web_app"),
    ...buttonLabelShape,
    url: z.string().url()
  })
  .superRefine(requireButtonLabel)
  .transform((button) => ({
    kind: "web_app" as const,
    label: button.label ?? button.text ?? "",
    url: button.url
  }));

const copyTextButtonSchema = z
  .object({
    kind: z.literal("copy_text"),
    ...buttonLabelShape,
    copyText: z.string().min(1).max(256)
  })
  .superRefine(requireButtonLabel)
  .transform((button) => ({
    kind: "copy_text" as const,
    label: button.label ?? button.text ?? "",
    copyText: button.copyText
  }));

const buttonSchema = z.union([
  callbackButtonSchema,
  urlButtonSchema,
  webAppButtonSchema,
  copyTextButtonSchema
]);

const buttonRowsSchema = z.preprocess(
  parseJsonString,
  z.array(z.array(buttonSchema).min(1).max(4)).min(1).max(12)
);

export const buttonLayoutSchema = z.object({
  columns: z.number().int().min(1).max(4).default(1)
});

export const sendButtonsInputSchema = z
  .object({
    platform: messagingPlatformSchema,
    conversationId: z.string().min(1),
    text: z.string().min(1).max(4096),
    buttons: z.preprocess(parseJsonString, z.array(buttonSchema).min(1).max(12)).optional(),
    rows: buttonRowsSchema.optional(),
    layout: buttonLayoutSchema.optional(),
    expiresInSeconds: z.number().int().min(60).max(86_400).optional()
  })
  .superRefine((input, context) => {
    if (!input.buttons?.length && !input.rows?.length) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "Either buttons or rows is required"
      });
    }

    if (input.buttons?.length && input.rows?.length) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "Cannot provide both buttons and rows"
      });
    }

    if (input.platform !== "telegram") {
      if (input.rows?.length) {
        context.addIssue({
          code: "custom",
          path: ["rows"],
          message: "Explicit button rows are only supported on Telegram"
        });
      }

      input.buttons?.forEach((button, index) => {
        if (button.kind !== "callback") {
          context.addIssue({
            code: "custom",
            path: ["buttons", index, "kind"],
            message: "Only callback buttons are supported on non-Telegram platforms"
          });
        }
      });
    }

    const rowButtonCount = input.rows?.reduce((count, row) => count + row.length, 0) ?? 0;
    if (rowButtonCount > 12) {
      context.addIssue({
        code: "custom",
        path: ["rows"],
        message: "Rows can contain at most 12 buttons total"
      });
    }
  });

export type SendButtonsInput = z.infer<typeof sendButtonsInputSchema>;

export const sendMessageInputJsonSchema = {
  type: "object",
  properties: {
    platform: {
      type: "string",
      enum: ["telegram", "qq", "wecom", "weixin_oc", "webhook", "admin", "webui", "email"],
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
      enum: ["telegram", "qq", "wecom", "weixin_oc", "webhook", "admin", "webui", "email"],
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

export const currentConversationFileInputJsonSchema = {
  type: "object",
  properties: {
    source: fileSourceJsonSchema,
    caption: {
      type: "string",
      description: "Optional caption."
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
  required: ["source"],
  additionalProperties: false
} as const;

export const sendButtonsInputJsonSchema = {
  type: "object",
  properties: {
    platform: {
      type: "string",
      enum: ["telegram", "qq", "wecom", "weixin_oc", "webhook", "admin", "webui", "email"],
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
          kind: {
            type: "string",
            enum: ["callback", "url", "web_app", "copy_text"],
            description:
              "Button kind. Omit for legacy callback buttons, or use callback, url, web_app, or copy_text. URL, web_app, and copy_text buttons are Telegram-only."
          },
          label: {
            type: "string",
            description: "Button label. Kept for compatibility with older calls."
          },
          text: {
            type: "string",
            description: "Button text shown to the user."
          },
          action: {
            type: "string",
            enum: ["agent.message", "pending.confirm", "pending.reject"],
            description: "Callback action when kind is callback."
          },
          payload: {
            type: "object",
            description: "Small callback payload stored server-side."
          },
          url: {
            type: "string",
            description: "URL opened by url or web_app buttons."
          },
          copyText: {
            type: "string",
            description: "Text copied by copy_text buttons."
          },
          reuse: {
            type: "boolean",
            description: "Allow callback buttons to be clicked more than once."
          },
          answerText: {
            type: "string",
            description: "Telegram callback response text."
          },
          showAlert: {
            type: "boolean",
            description: "Show Telegram callback response as an alert."
          },
          removeKeyboardOnClick: {
            type: "boolean",
            description: "Remove the inline keyboard after a callback is handled."
          },
          editMessageText: {
            type: "string",
            description: "Replace the original message text after a callback is handled."
          },
          silent: {
            type: "boolean",
            description: "Handle the callback without enqueueing an agent message."
          }
        },
        additionalProperties: false
      }
    },
    rows: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      description:
        "Telegram-only explicit keyboard rows. Use this instead of buttons + layout when row placement matters. The total number of buttons across all rows must not exceed 12; this limit is enforced by application validation.",
      "x-totalButtonLimit": 12,
      items: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: ["callback", "url", "web_app", "copy_text"]
            },
            label: {
              type: "string"
            },
            text: {
              type: "string"
            },
            action: {
              type: "string",
              enum: ["agent.message", "pending.confirm", "pending.reject"]
            },
            payload: {
              type: "object"
            },
            url: {
              type: "string"
            },
            copyText: {
              type: "string"
            },
            reuse: {
              type: "boolean"
            },
            answerText: {
              type: "string"
            },
            showAlert: {
              type: "boolean"
            },
            removeKeyboardOnClick: {
              type: "boolean"
            },
            editMessageText: {
              type: "string"
            },
            silent: {
              type: "boolean"
            }
          },
          additionalProperties: false
        }
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
  required: ["platform", "conversationId", "text"],
  oneOf: [{ required: ["buttons"] }, { required: ["rows"] }],
  additionalProperties: false
} as const;

function requireButtonLabel(
  button: { label?: string; text?: string },
  context: z.RefinementCtx
): void {
  if (!button.label && !button.text) {
    context.addIssue({
      code: "custom",
      path: [],
      message: "Button label or text is required"
    });
  }
}

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
