import { createTelegramOutboundAdapter } from "../../adapters/telegram/outbound";
import type { Env } from "../../shared/types/env";
import type { Platform } from "../../shared/types/internal-message";
import type { PlatformOutboundAdapter } from "./types";

export function getPlatformOutboundAdapter(
  env: Env,
  platform: Platform
): PlatformOutboundAdapter | undefined {
  if (platform === "telegram") {
    return createTelegramOutboundAdapter(env);
  }

  return undefined;
}
