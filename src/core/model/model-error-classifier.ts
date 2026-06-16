const MODEL_PROVIDER_ERROR_PATTERNS = [
  "openai_error",
  "openai-compatible api error",
  "openai api error",
  "gemini_error",
  "gemini api error",
  "anthropic",
  "claude",
  "model_error",
  "api_error",
  "rate limit",
  "quota exceeded",
  "context length",
  "token limit exceeded",
  "timeout",
  "429"
] as const;

export function looksLikeModelProviderError(message: string): boolean {
  const lower = message.toLowerCase();
  return MODEL_PROVIDER_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}
