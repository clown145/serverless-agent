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

  it("sends OpenAI-compatible image parts", async () => {
    const fetchMock = vi.fn(async () => {
      return jsonResponse({ choices: [{ message: { content: "seen" } }] });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test",
      model: "gpt-test"
    });
    await provider.complete({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "look" },
            { type: "image", mimeType: "image/png", dataBase64: "aGVsbG8=" }
          ]
        }
      ],
      tools: []
    });

    const body = fetchBody(fetchMock);
    expect(body.messages).toMatchObject([
      {
        role: "user",
        content: [
          { type: "text", text: "look" },
          { type: "image_url", image_url: { url: "data:image/png;base64,aGVsbG8=" } }
        ]
      }
    ]);
  });

  it("retries OpenAI-compatible tool results as text for strict proxies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: "Param Incorrect" } }, { status: 400 })
      )
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "done" } }] }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test",
      model: "gpt-test"
    });
    await expect(
      provider.complete({
        messages: [
          { role: "user", content: "list files" },
          {
            role: "assistant",
            toolCalls: [
              {
                id: "call_1",
                name: "vfs.list_dir",
                arguments: { path: "/" }
              }
            ]
          },
          {
            role: "tool",
            toolCallId: "call_1",
            toolName: "vfs.list_dir",
            content: '[{"path":"/workspace"}]'
          }
        ],
        tools: [
          {
            name: "vfs.list_dir",
            description: "List files",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string" }
              }
            }
          }
        ]
      })
    ).resolves.toMatchObject({ content: "done" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchBodyAt(fetchMock, 0).messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "tool",
          tool_call_id: "call_1"
        })
      ])
    );
    const retryMessages = fetchBodyAt(fetchMock, 1).messages as Array<Record<string, unknown>>;
    expect(retryMessages.some((message) => message.role === "tool")).toBe(false);
    expect(retryMessages.some((message) => "tool_calls" in message)).toBe(false);
    expect(retryMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining("Tool result for vfs_list_dir")
        })
      ])
    );
  });

  it("sends OpenAI-compatible reasoning effort and tool-call reasoning content", async () => {
    const fetchMock = vi.fn(async () => {
      return jsonResponse({
        choices: [
          {
            message: {
              content: "done",
              reasoning_content: "hidden reasoning"
            }
          }
        ]
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test",
      model: "mimo-test",
      baseUrl: "https://api.mimo.example/v1"
    });
    const response = await provider.complete({
      messages: [
        { role: "user", content: "list files" },
        {
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              name: "vfs.list_dir",
              arguments: { path: "/" }
            }
          ],
          reasoning: { content: "previous hidden reasoning" }
        }
      ],
      tools: [],
      reasoning: {
        effort: "normal",
        stateMode: "auto"
      }
    });

    const body = fetchBody(fetchMock);
    expect(body.reasoning_effort).toBe("medium");
    expect(body.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "assistant",
          reasoning_content: "previous hidden reasoning"
        })
      ])
    );
    expect(response.reasoning).toEqual({ content: "hidden reasoning" });
  });

  it("does not send OpenAI-compatible reasoning content when state is off", async () => {
    const fetchMock = vi.fn(async () => {
      return jsonResponse({ choices: [{ message: { content: "done" } }] });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test",
      model: "mimo-test",
      baseUrl: "https://api.mimo.example/v1"
    });
    await provider.complete({
      messages: [
        {
          role: "assistant",
          toolCalls: [
            {
              id: "call_1",
              name: "vfs.list_dir",
              arguments: { path: "/" }
            }
          ],
          reasoning: { content: "previous hidden reasoning" }
        }
      ],
      tools: [],
      reasoning: {
        effort: "auto",
        stateMode: "off"
      }
    });

    const body = fetchBody(fetchMock);
    expect(JSON.stringify(body.messages)).not.toContain("reasoning_content");
    expect(body).not.toHaveProperty("reasoning_effort");
  });

  it("sends Gemini inline image parts", async () => {
    const fetchMock = vi.fn(async () => {
      return jsonResponse({ candidates: [{ content: { parts: [{ text: "seen" }] } }] });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new GeminiProvider({
      apiKey: "test",
      model: "gemini-test"
    });
    await provider.complete({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "look" },
            { type: "image", mimeType: "image/png", dataBase64: "aGVsbG8=" }
          ]
        }
      ],
      tools: []
    });

    const body = fetchBody(fetchMock);
    expect(body.contents).toMatchObject([
      {
        role: "user",
        parts: [{ text: "look" }, { inlineData: { mimeType: "image/png", data: "aGVsbG8=" } }]
      }
    ]);
  });
});

function fetchBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return fetchBodyAt(fetchMock, 0);
}

function fetchBodyAt(fetchMock: ReturnType<typeof vi.fn>, index: number): Record<string, unknown> {
  const init = fetchMock.mock.calls[index]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init
  });
}
