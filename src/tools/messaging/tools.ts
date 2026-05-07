import { sendTelegramText } from "../../adapters/telegram/outbound";
import { insertOutboundTextMessage } from "../../storage/repositories/messages-repository";
import { builtinTool } from "../builtin/source";
import type { RegisteredTool, ToolResult } from "../types";
import { sendMessageInputJsonSchema, sendMessageInputSchema } from "./schema";

export function createMessagingTools(): RegisteredTool[] {
  return [
    builtinTool({
      definition: {
        name: "messaging.send_message",
        title: "Send Message",
        description: "Send a message to a supported platform conversation.",
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

        if (parsed.data.platform === "telegram") {
          const result = await sendTelegramText(
            context.env,
            parsed.data.conversationId,
            parsed.data.text
          );

          if (!result.ok) {
            return failed("telegram_send_failed", result.error ?? "Failed", true);
          }

          const message = await insertOutboundTextMessage(context.env.AGENT_DB, {
            agentId: context.agentId,
            platform: "telegram",
            conversationId: parsed.data.conversationId,
            text: parsed.data.text,
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

        return failed(
          "platform_not_supported",
          `${parsed.data.platform} outbound messaging is not implemented yet`,
          false
        );
      }
    })
  ];
}

function failed(code: string, message: string, retryable: boolean): ToolResult {
  return {
    status: "failed",
    error: { code, message, retryable }
  };
}
