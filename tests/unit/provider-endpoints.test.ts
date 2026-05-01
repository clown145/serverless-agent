import { describe, expect, it } from "vitest";
import {
  geminiGenerateUrl,
  geminiModelsUrl,
  openAiChatUrl,
  openAiModelsUrl
} from "../../src/core/model/provider-endpoints";

describe("provider endpoints", () => {
  it("normalizes OpenAI-compatible base URLs", () => {
    expect(openAiChatUrl("https://api.openai.com/v1")).toBe(
      "https://api.openai.com/v1/chat/completions"
    );
    expect(openAiChatUrl("https://api.openai.com/v1/models")).toBe(
      "https://api.openai.com/v1/chat/completions"
    );
    expect(openAiModelsUrl("https://api.openai.com/v1/chat/completions")).toBe(
      "https://api.openai.com/v1/models"
    );
  });

  it("normalizes Gemini model paths", () => {
    expect(geminiModelsUrl("https://generativelanguage.googleapis.com/v1beta")).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models"
    );
    expect(geminiGenerateUrl("https://generativelanguage.googleapis.com/v1beta", "gemini-2.5-flash")).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    );
    expect(geminiGenerateUrl("https://generativelanguage.googleapis.com/v1beta", "models/gemini-2.5-flash")).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    );
  });
});
