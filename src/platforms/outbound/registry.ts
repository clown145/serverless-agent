import { createQqOfficialOutboundAdapter } from "../../adapters/qq/official/outbound";
import { createTelegramOutboundAdapter } from "../../adapters/telegram/outbound";
import { createWecomOutboundAdapter } from "../../adapters/wecom/outbound";
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

  if (platform === "qq") {
    return createQqOfficialOutboundAdapter(env);
  }

  if (platform === "wecom") {
    return createWecomOutboundAdapter(env);
  }

  return undefined;
}
