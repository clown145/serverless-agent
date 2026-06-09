import { describe, expect, it } from "vitest";
import { looksLikeModelProviderError } from "../../src/core/model/model-error-classifier";

describe("looksLikeModelProviderError", () => {
  it("matches current provider fallback error messages", () => {
    expect(looksLikeModelProviderError("OpenAI-compatible API error 429")).toBe(true);
    expect(looksLikeModelProviderError("Gemini API error 400")).toBe(true);
  });

  it("matches common provider and quota error hints", () => {
    expect(looksLikeModelProviderError("anthropic: overloaded")).toBe(true);
    expect(looksLikeModelProviderError("Claude rate limit exceeded")).toBe(true);
    expect(looksLikeModelProviderError("context length exceeded")).toBe(true);
  });

  it("does not match unrelated failures", () => {
    expect(looksLikeModelProviderError("tool execution failed")).toBe(false);
    expect(looksLikeModelProviderError("insufficient permissions for required tools")).toBe(false);
  });
});
