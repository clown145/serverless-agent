import type { InternalMessage, Platform } from "../../shared/types/internal-message";

export type PlatformContextHints = {
  formatInstruction: string;
};

export type ResolvePlatformContextHintsInput = {
  message: InternalMessage;
};

export type PlatformContextHintsAdapter = {
  platform: Platform;
  resolveContextHints(input: ResolvePlatformContextHintsInput): Promise<PlatformContextHints>;
};
