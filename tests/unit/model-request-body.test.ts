import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "../../src/core/model/gemini-provider";
import { OpenAiCompatibleProvider } from "../../src/core/model/openai-compatible-provider";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("model request bodies", () => {
  it("omits OpenAI tools when no tools are available", async () => {
    const fetchMock = vi.fn(async () => {
      return jsonResponse({ choices: [{ message: { content: "pong" } }] });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test",
      model: "gpt-test"
    });
    await provider.complete({
      messages: [{ role: "user", content: "ping" }],
      tools: []
    });

    const body = fetchBody(fetchMock);
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("tool_choice");
  });

  it("omits Gemini tools when no tools are available", async () => {
    const fetchMock = vi.fn(async () => {
      return jsonResponse({ candidates: [{ content: { parts: [{ text: "pong" }] } }] });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new GeminiProvider({
      apiKey: "test",
      model: "gemini-test"
    });
    await provider.complete({
      messages: [{ role: "user", content: "ping" }],
      tools: []
    });

    const body = fetchBody(fetchMock);
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("toolConfig");
  });
});

function fetchBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" }
  });
}
