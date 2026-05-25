import type { ModelMessage } from "./types";
import {
  resolveReasoningStatePolicy,
  shouldSendReasoningEffort,
  shouldSendReasoningState,
  toOpenAiReasoningEffort
} from "./reasoning-policy";
import { defaultReasoningSettings, type ReasoningSettings } from "./reasoning-types";

export type OpenAiReasoningOptions = {
  model: string;
  baseUrl?: string;
  settings?: ReasoningSettings;
};

export function openAiReasoningBodyFields(options: OpenAiReasoningOptions): Record<string, unknown> {
  const settings = options.settings ?? defaultReasoningSettings();
  if (!shouldSendReasoningEffort(settings)) {
    return {};
  }

  const effort = toOpenAiReasoningEffort(settings.effort);
  return effort ? { reasoning_effort: effort } : {};
}

export function openAiReasoningContent(
  message: ModelMessage,
  options: OpenAiReasoningOptions
): string | undefined {
  if (message.role !== "assistant" || !message.reasoning?.content) {
    return undefined;
  }

  const settings = options.settings ?? defaultReasoningSettings();
  const policy = resolveReasoningStatePolicy(
    {
      provider: "openai",
      model: options.model,
      baseUrl: options.baseUrl
    },
    settings.stateMode
  );

  const hasToolCalls = Boolean(message.toolCalls?.length);
  return shouldSendReasoningState({ policy, hasToolCalls }) ? message.reasoning.content : undefined;
}

export function extractOpenAiReasoningContent(message: unknown): string | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }

  const value = (message as { reasoning_content?: unknown }).reasoning_content;
  return typeof value === "string" && value ? value : undefined;
}

export function openAiReasoningFromResponse(message: unknown): { content?: string } | undefined {
  const content = extractOpenAiReasoningContent(message);
  return content ? { content } : undefined;
}
