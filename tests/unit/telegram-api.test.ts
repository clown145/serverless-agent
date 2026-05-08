import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getTelegramMe,
  setTelegramWebhook
} from "../../src/adapters/telegram/api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("telegram api", () => {
  it("calls getMe with the bot token", async () => {
    const fetchMock = vi.fn(async () => {
      return jsonResponse({ ok: true, result: { id: 1, is_bot: true, first_name: "Bot" } });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(getTelegramMe("token")).resolves.toMatchObject({ id: 1 });
    const call = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    expect(String(call[0])).toContain("/bottoken/getMe");
  });

  it("sets webhook with secret token and allowed updates", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, result: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await setTelegramWebhook({
      token: "token",
      url: "https://agent.example/webhooks/telegram",
      secretToken: "secret"
    });

    expect(fetchBody(fetchMock)).toMatchObject({
      url: "https://agent.example/webhooks/telegram",
      secret_token: "secret",
      allowed_updates: ["message", "edited_message"]
    });
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
