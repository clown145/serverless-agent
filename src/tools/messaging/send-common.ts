import { insertOutboundTextMessage } from "../../storage/repositories/messages-repository";
import type { Platform } from "../../shared/types/internal-message";
import type { RegisteredTool, ToolResult } from "../types";
import { failed } from "./result";

export async function handlePlatformResult(
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

export function unsupported(platform: string, capability: string): ToolResult {
  return failed("capability_not_supported", `${platform} does not support ${capability}`, false);
}
