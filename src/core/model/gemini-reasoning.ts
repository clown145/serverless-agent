import {
  resolveReasoningStatePolicy,
  shouldSendReasoningEffort,
  shouldSendReasoningState
} from "./reasoning-policy";
import {
  defaultReasoningSettings,
  type GeminiThoughtSignature,
  type ReasoningSettings,
  type ReasoningState
} from "./reasoning-types";
import type { ModelMessage, ModelToolCall } from "./types";
import type { GeminiPart } from "./gemini-format";

export type GeminiReasoningOptions = {
  model: string;
  baseUrl?: string;
  settings?: ReasoningSettings;
};

export function geminiGenerationConfig(
  options: GeminiReasoningOptions
): Record<string, unknown> | undefined {
  const settings = options.settings ?? defaultReasoningSettings();
  if (!shouldSendReasoningEffort(settings)) {
    return undefined;
  }

  const thinkingConfig = geminiThinkingConfig(options.model, settings);
  return thinkingConfig ? { thinkingConfig } : undefined;
}

export function geminiThinkingConfig(
  model: string,
  settings: ReasoningSettings
): Record<string, unknown> | undefined {
  if (settings.effort === "auto") {
    return undefined;
  }

  if (isGemini3Model(model)) {
    return { thinkingLevel: geminiThinkingLevel(settings.effort) };
  }

  if (isGemini25Model(model)) {
    return { thinkingBudget: geminiThinkingBudget(settings.effort) };
  }

  return undefined;
}

export function geminiReasoningFromParts(
  parts: GeminiPart[],
  toolCalls: ModelToolCall[]
): ReasoningState | undefined {
  const signatures: GeminiThoughtSignature[] = [];
  let functionCallIndex = 0;

  parts.forEach((part, partIndex) => {
    const thoughtSignature = part.thoughtSignature;

    if (part.functionCall) {
      if (thoughtSignature) {
        const toolCall = toolCalls[functionCallIndex];
        signatures.push({
          partIndex,
          partKind: "functionCall",
          thoughtSignature,
          functionCallIndex,
          toolCallId: toolCall?.id ?? part.functionCall.id,
          toolName: toolCall?.name ?? part.functionCall.name
        });
      }
      functionCallIndex += 1;
      return;
    }

    if (part.text !== undefined && thoughtSignature) {
      signatures.push({
        partIndex,
        partKind: "text",
        thoughtSignature
      });
    }
  });

  return signatures.length ? { gemini: { thoughtSignatures: signatures } } : undefined;
}

export function geminiTextThoughtSignature(
  message: ModelMessage,
  options: GeminiReasoningOptions
): string | undefined {
  if (message.role !== "assistant") {
    return undefined;
  }

  return shouldSendGeminiReasoningState(message, options)
    ? firstGeminiSignature(message.reasoning, "text")?.thoughtSignature
    : undefined;
}

export function geminiFunctionCallThoughtSignatures(
  message: ModelMessage,
  toolCalls: ModelToolCall[],
  options: GeminiReasoningOptions
): Array<string | undefined> {
  if (message.role !== "assistant" || !shouldSendGeminiReasoningState(message, options)) {
    return toolCalls.map(() => undefined);
  }

  const signatures = message.reasoning?.gemini?.thoughtSignatures ?? [];
  return toolCalls.map((toolCall, index) => {
    const exact = signatures.find(
      (signature) =>
        signature.partKind === "functionCall" &&
        (signature.toolCallId === toolCall.id ||
          (signature.functionCallIndex === index && signature.toolName === toolCall.name))
    );
    if (exact) {
      return exact.thoughtSignature;
    }

    return signatures.find(
      (signature) => signature.partKind === "functionCall" && signature.functionCallIndex === index
    )?.thoughtSignature;
  });
}

function shouldSendGeminiReasoningState(
  message: ModelMessage,
  options: GeminiReasoningOptions
): boolean {
  const settings = options.settings ?? defaultReasoningSettings();
  const policy = resolveReasoningStatePolicy(
    {
      provider: "gemini",
      model: options.model,
      baseUrl: options.baseUrl
    },
    settings.stateMode
  );
  return shouldSendReasoningState({
    policy,
    hasToolCalls: Boolean(message.role === "assistant" && message.toolCalls?.length)
  });
}

function firstGeminiSignature(
  reasoning: ReasoningState | undefined,
  partKind: GeminiThoughtSignature["partKind"]
): GeminiThoughtSignature | undefined {
  return reasoning?.gemini?.thoughtSignatures?.find((signature) => signature.partKind === partKind);
}

function geminiThinkingLevel(effort: ReasoningSettings["effort"]): string {
  switch (effort) {
    case "low":
      return "low";
    case "normal":
      return "medium";
    case "high":
      return "high";
    case "auto":
      return "high";
  }
}

function geminiThinkingBudget(effort: ReasoningSettings["effort"]): number {
  switch (effort) {
    case "low":
      return 1024;
    case "normal":
      return 8192;
    case "high":
      return -1;
    case "auto":
      return -1;
  }
}

function isGemini3Model(model: string): boolean {
  return normalizedModel(model).includes("gemini-3");
}

function isGemini25Model(model: string): boolean {
  return normalizedModel(model).includes("gemini-2.5");
}

function normalizedModel(model: string): string {
  return model.toLowerCase();
}
