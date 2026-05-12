import { getPlatformOutboundAdapter } from "../../platforms/outbound/registry";
import { insertOutboundTextMessage } from "../../storage/repositories/messages-repository";
import type { Platform } from "../../shared/types/internal-message";
import { builtinTool } from "../builtin/source";
import type { RegisteredTool, ToolResult } from "../types";
import { resolveOutboundFile } from "./file-source";
import { failed } from "./result";
import {
  sendButtonsInputJsonSchema,
  sendButtonsInputSchema,
  sendFileInputJsonSchema,
  sendFileInputSchema,
  sendImageInputJsonSchema,
  sendImageInputSchema,
  sendMessageInputJsonSchema,
  sendMessageInputSchema
} from "./schema";

export function createMessagingTools(): RegisteredTool[] {
  return [
    sendMessageTool(),
    sendFileTool(),
    sendImageTool(),
    sendButtonsTool()
  ];
}

function sendMessageTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "messaging.send_message",
      title: "Send Message",
      description: "Send a text message to a supported platform conversation.",
      inputSchema: sendMessageInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: true
      },
      permission: {
        level: 3,
        scopes: ["message:send"]
      },
      sideEffect: "external_write",
      timeoutMs: 10_000
    },
    execute: async (context) => {
      const parsed = sendMessageInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const adapter = getPlatformOutboundAdapter(
        context.env,
        parsed.data.platform as Platform
      );
      if (adapter?.sendText) {
        const result = await adapter.sendText({
          agentId: context.agentId,
          conversationId: parsed.data.conversationId,
          text: parsed.data.text
        });
        return handlePlatformResult(context, parsed.data, result);
      }

      if (parsed.data.platform === "admin" || parsed.data.platform === "webui") {
        const message = await insertOutboundTextMessage(context.env.AGENT_DB, {
          agentId: context.agentId,
          platform: parsed.data.platform,
          conversationId: parsed.data.conversationId,
          text: parsed.data.text
        });

        return {
          status: "success",
          output: { delivered: false, messageId: message.id }
        };
      }

      return unsupported(parsed.data.platform, "send text");
    }
  });
}

function sendFileTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "messaging.send_file",
      title: "Send File",
      description: "Send a file from VFS, an attachment, or a public URL.",
      inputSchema: sendFileInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: true
      },
      permission: {
        level: 3,
        scopes: ["message:send_file"]
      },
      sideEffect: "external_write",
      timeoutMs: 20_000
    },
    execute: async (context) => {
      const parsed = sendFileInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const adapter = getPlatformOutboundAdapter(
        context.env,
        parsed.data.platform as Platform
      );
      if (!adapter?.sendFile) {
        return unsupported(parsed.data.platform, "send files");
      }

      const file = await resolveOutboundFile(context, parsed.data.source, {
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType
      });
      const result = await adapter.sendFile({
        agentId: context.agentId,
        conversationId: parsed.data.conversationId,
        file,
        caption: parsed.data.caption
      });

      return handlePlatformResult(context, parsed.data, result);
    }
  });
}

function sendImageTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "messaging.send_image",
      title: "Send Image",
      description: "Send an image from VFS, an attachment, or a public URL.",
      inputSchema: sendImageInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: true
      },
      permission: {
        level: 3,
        scopes: ["message:send_image"]
      },
      sideEffect: "external_write",
      timeoutMs: 20_000
    },
    execute: async (context) => {
      const parsed = sendImageInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const adapter = getPlatformOutboundAdapter(
        context.env,
        parsed.data.platform as Platform
      );
      if (!adapter?.sendImage) {
        return unsupported(parsed.data.platform, "send images");
      }

      const file = await resolveOutboundFile(context, parsed.data.source, {
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType
      });
      const result = await adapter.sendImage({
        agentId: context.agentId,
        conversationId: parsed.data.conversationId,
        file,
        caption: parsed.data.caption
      });

      return handlePlatformResult(context, parsed.data, result);
    }
  });
}

function sendButtonsTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "messaging.send_buttons",
      title: "Send Buttons",
      description: "Send a message with interactive buttons when the platform supports it.",
      inputSchema: sendButtonsInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: true
      },
      permission: {
        level: 3,
        scopes: ["message:send_buttons"]
      },
      sideEffect: "external_write",
      timeoutMs: 10_000
    },
    execute: async (context) => {
      const parsed = sendButtonsInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const adapter = getPlatformOutboundAdapter(
        context.env,
        parsed.data.platform as Platform
      );
      if (!adapter?.sendButtons) {
        return unsupported(parsed.data.platform, "send buttons");
      }

      const result = await adapter.sendButtons({
        agentId: context.agentId,
        conversationId: parsed.data.conversationId,
        text: parsed.data.text,
        buttons: parsed.data.buttons,
        expiresInSeconds: parsed.data.expiresInSeconds
      });

      return handlePlatformResult(context, parsed.data, result);
    }
  });
}

async function handlePlatformResult(
  context: Parameters<RegisteredTool["execute"]>[0],
  input: {
    platform: Platform;
    conversationId: string;
    text?: string;
    caption?: string;
  },
  result: { ok: boolean; providerMessageId?: string; error?: string }
): Promise<ToolResult> {
  if (!result.ok) {
    return failed("platform_send_failed", result.error ?? "Platform send failed", true);
  }

  const message = await insertOutboundTextMessage(context.env.AGENT_DB, {
    agentId: context.agentId,
    platform: input.platform,
    conversationId: input.conversationId,
    text: input.text ?? input.caption ?? "[attachment]",
    platformMessageId: result.providerMessageId
  });

  return {
    status: "success",
    output: {
      messageId: message.id,
      providerMessageId: result.providerMessageId
    }
  };
}

function unsupported(platform: string, capability: string): ToolResult {
  return failed(
    "capability_not_supported",
    `${platform} does not support ${capability}`,
    false
  );
}
