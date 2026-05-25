import type { ModelProviderName } from "./types";
import type {
  ReasoningEffort,
  ReasoningSettings,
  ReasoningStateMode,
  ReasoningStatePolicy
} from "./reasoning-types";

export type ReasoningProviderInfo = {
  provider: ModelProviderName;
  model?: string;
  baseUrl?: string;
};

export function resolveReasoningStatePolicy(
  info: ReasoningProviderInfo,
  stateMode: ReasoningStateMode
): ReasoningStatePolicy {
  if (stateMode === "off") {
    return "none";
  }

  if (stateMode === "on") {
    return "all_assistant";
  }

  return inferReasoningStatePolicy(info);
}

export function shouldSendReasoningState(input: {
  policy: ReasoningStatePolicy;
  hasToolCalls: boolean;
}): boolean {
  switch (input.policy) {
    case "all_assistant":
      return true;
    case "tool_calls_only":
      return input.hasToolCalls;
    case "forbidden":
    case "none":
      return false;
  }
}

export function shouldSendReasoningEffort(settings: ReasoningSettings): boolean {
  return settings.effort !== "auto";
}

export function toOpenAiReasoningEffort(effort: ReasoningEffort): string | undefined {
  switch (effort) {
    case "low":
      return "low";
    case "normal":
      return "medium";
    case "high":
      return "high";
    case "auto":
      return undefined;
  }
}

export function inferReasoningStatePolicy(info: ReasoningProviderInfo): ReasoningStatePolicy {
  const haystack = `${info.baseUrl ?? ""} ${info.model ?? ""}`.toLowerCase();

  if (haystack.includes("deepseek-reasoner")) {
    return "forbidden";
  }

  if (
    haystack.includes("mimo") ||
    haystack.includes("xiaomi") ||
    haystack.includes("deepseek") ||
    haystack.includes("kimi") ||
    haystack.includes("moonshot") ||
    haystack.includes("qwen") ||
    haystack.includes("openrouter")
  ) {
    return "tool_calls_only";
  }

  return "none";
}
