export type ReasoningEffort = "auto" | "low" | "normal" | "high";

export type ReasoningStateMode = "auto" | "on" | "off";

export type ReasoningStatePolicy = "none" | "forbidden" | "tool_calls_only" | "all_assistant";

export type ReasoningSettings = {
  effort: ReasoningEffort;
  stateMode: ReasoningStateMode;
};

export type ReasoningState = {
  content?: string;
  gemini?: {
    thoughtSignatures?: GeminiThoughtSignature[];
  };
};

export type GeminiThoughtSignature = {
  partIndex: number;
  partKind: "text" | "functionCall";
  thoughtSignature: string;
  functionCallIndex?: number;
  toolCallId?: string;
  toolName?: string;
};

export const DEFAULT_REASONING_EFFORT: ReasoningEffort = "auto";
export const DEFAULT_REASONING_STATE_MODE: ReasoningStateMode = "auto";

export function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  return value === "low" || value === "normal" || value === "high" ? value : "auto";
}

export function normalizeReasoningStateMode(value: unknown): ReasoningStateMode {
  return value === "on" || value === "off" ? value : "auto";
}

export function defaultReasoningSettings(): ReasoningSettings {
  return {
    effort: DEFAULT_REASONING_EFFORT,
    stateMode: DEFAULT_REASONING_STATE_MODE
  };
}
