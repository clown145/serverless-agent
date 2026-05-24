import { findActivePlatformIntegration } from "../../storage/repositories/platform-integrations-repository";
import { promptText } from "../../prompts";
import type { Env } from "../../shared/types/env";
import { normalizeTelegramParseMode, type TelegramParseMode } from "./formatting";
import type {
  PlatformContextHints,
  PlatformContextHintsAdapter,
  ResolvePlatformContextHintsInput
} from "../../platforms/context-hints/types";

export function createTelegramContextHintsAdapter(env: Env): PlatformContextHintsAdapter {
  return {
    platform: "telegram",
    resolveContextHints: (input) => resolveTelegramContextHints(env, input)
  };
}

async function resolveTelegramContextHints(
  env: Env,
  input: ResolvePlatformContextHintsInput
): Promise<PlatformContextHints> {
  const integration = await findActivePlatformIntegration(env.AGENT_DB, {
    agentId: input.message.agentId,
    platform: "telegram"
  });

  return {
    formatInstruction: telegramFormatInstruction(
      normalizeTelegramParseMode(integration?.config.parseMode)
    )
  };
}

function telegramFormatInstruction(parseMode: TelegramParseMode): string {
  if (parseMode === "none") {
    return promptText("platforms/telegram-plain");
  }

  if (parseMode === "MarkdownV2") {
    return promptText("platforms/telegram-markdown-v2");
  }

  return promptText("platforms/telegram-html");
}
