import { findActivePlatformIntegration } from "../../storage/repositories/platform-integrations-repository";
import type { Env } from "../../shared/types/env";
import {
  normalizeTelegramParseMode,
  type TelegramParseMode
} from "./formatting";
import type {
  PlatformContextHints,
  PlatformContextHintsAdapter,
  ResolvePlatformContextHintsInput
} from "../../platforms/context-hints/types";

export function createTelegramContextHintsAdapter(
  env: Env
): PlatformContextHintsAdapter {
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
    return [
      "Telegram formatting: messages are sent as plain text.",
      "Avoid Markdown tables, HTML tags, and formatting that requires Telegram parse mode.",
      "Use short sections, numbered lines, plain URLs, and compact text."
    ].join("\n");
  }

  if (parseMode === "MarkdownV2") {
    return [
      "Telegram formatting: messages are sent with Telegram parse_mode MarkdownV2.",
      "MarkdownV2 requires escaping reserved characters: _ * [ ] ( ) ~ ` > # + - = | { } . !",
      "Prefer simple bold/italic/code only when you can escape correctly; avoid tables and complex formatting."
    ].join("\n");
  }

  return [
    "Telegram formatting: messages are sent with Telegram parse_mode HTML by default.",
    "Use only Telegram-supported HTML tags when useful: <b>, <i>, <u>, <s>, <code>, <pre>, <a href=\"https://...\">text</a>.",
    "Escape literal <, >, and & when they are not part of supported tags.",
    "Avoid Markdown tables and MarkdownV2-specific syntax; use short sections, numbered lines, plain URLs, and compact text."
  ].join("\n");
}
