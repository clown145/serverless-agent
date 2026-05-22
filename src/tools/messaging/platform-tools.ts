import { getPlatformOutboundAdapter } from "../../platforms/outbound/registry";
import type { Platform } from "../../shared/types/internal-message";
import { builtinTool } from "../builtin/source";
import type { RegisteredTool, ToolResult } from "../types";
import { resolveOutboundFile } from "./file-source";
import { failed } from "./result";
import { handlePlatformResult, unsupported } from "./send-common";
import {
  currentConversationFileInputJsonSchema,
  currentConversationFileInputSchema
} from "./schema";

type PlatformMediaTool = {
  name: string;
  title: string;
  platform: Extract<Platform, "telegram" | "weixin_oc">;
  kind: "file" | "image";
};

const PLATFORM_MEDIA_TOOLS: PlatformMediaTool[] = [
  {
    name: "telegram.send_file",
    title: "Telegram Send File",
    platform: "telegram",
    kind: "file"
  },
  {
    name: "telegram.send_image",
    title: "Telegram Send Image",
    platform: "telegram",
    kind: "image"
  },
  {
    name: "weixin_oc.send_file",
    title: "WeChat Personal Send File",
    platform: "weixin_oc",
    kind: "file"
  },
  {
    name: "weixin_oc.send_image",
    title: "WeChat Personal Send Image",
    platform: "weixin_oc",
    kind: "image"
  }
];

export function platformMessagingTools(): RegisteredTool[] {
  return PLATFORM_MEDIA_TOOLS.map(createPlatformMediaTool);
}

function createPlatformMediaTool(config: PlatformMediaTool): RegisteredTool {
  return builtinTool({
    definition: {
      name: config.name,
      title: config.title,
      description: `Send a ${config.kind} to the current ${config.platform} conversation.`,
      inputSchema: currentConversationFileInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: true
      },
      platforms: [config.platform],
      permission: {
        level: 3,
        scopes: [`message:send_${config.kind}`]
      },
      behavior: {
        preventsFinalResponse: true
      },
      sideEffect: "external_write",
      timeoutMs: 20_000
    },
    execute: async (context) => executeCurrentConversationMedia(context, config)
  });
}

async function executeCurrentConversationMedia(
  context: Parameters<RegisteredTool["execute"]>[0],
  config: PlatformMediaTool
): Promise<ToolResult> {
  const parsed = currentConversationFileInputSchema.safeParse(context.input);
  if (!parsed.success) {
    return failed("invalid_input", parsed.error.message, false);
  }
  if (context.platform !== config.platform) {
    return failed(
      "platform_tool_unavailable",
      `${config.name} is only available in ${config.platform} conversations`,
      false
    );
  }
  if (!context.conversationId) {
    return failed("missing_conversation", "Current conversation id is missing", false);
  }

  const adapter = getPlatformOutboundAdapter(context.env, config.platform);
  const sender = config.kind === "image" ? adapter?.sendImage : adapter?.sendFile;
  if (!sender) {
    return unsupported(config.platform, config.kind === "image" ? "send images" : "send files");
  }

  const file = await resolveOutboundFile(context, parsed.data.source, {
    fileName: parsed.data.fileName,
    mimeType: parsed.data.mimeType
  });
  const result = await sender({
    agentId: context.agentId,
    conversationId: context.conversationId,
    file,
    caption: parsed.data.caption
  });

  return handlePlatformResult(
    context,
    {
      platform: config.platform,
      conversationId: context.conversationId,
      caption: parsed.data.caption
    },
    result
  );
}
