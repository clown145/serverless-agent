import { createTelegramContextHintsAdapter } from "../adapters/telegram/context-hints";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import type {
  PlatformContextHints,
  PlatformContextHintsAdapter
} from "./context-hints/types";

export type { PlatformContextHints } from "./context-hints/types";

export async function resolvePlatformContextHints(
  env: Env,
  message: InternalMessage
): Promise<PlatformContextHints> {
  const adapter = getPlatformContextHintsAdapter(env, message.platform);
  if (adapter) {
    return adapter.resolveContextHints({ message });
  }

  return {
    formatInstruction: defaultPlatformFormatInstruction(message.platform)
  };
}

function getPlatformContextHintsAdapter(
  env: Env,
  platform: InternalMessage["platform"]
): PlatformContextHintsAdapter | undefined {
  if (platform === "telegram") {
    return createTelegramContextHintsAdapter(env);
  }

  return undefined;
}

function defaultPlatformFormatInstruction(platform: InternalMessage["platform"]): string {
  if (platform === "webui" || platform === "admin") {
    return "WebUI formatting: concise Markdown-style text is acceptable, but avoid very wide tables.";
  }

  return "Platform formatting: keep output plain, compact, and compatible with chat clients.";
}
