import { afterEach, describe, expect, it, vi } from "vitest";
import {
  sendTelegramButtons,
  sendTelegramChatAction
} from "../../src/adapters/telegram/outbound";
import type { Env } from "../../src/shared/types/env";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("telegram outbound", () => {
  it("sends chat action activity", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ok: true, result: true })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendTelegramChatAction(
      {
        AGENT_DB: createOutboundDb() as unknown as D1Database,
        TELEGRAM_BOT_TOKEN: "token"
      } as unknown as Env,
      "default",
      "telegram:123",
      "typing"
    );

    expect(result).toMatchObject({ ok: true });
    expect(fetchUrl(fetchMock)).toContain("/bottoken/sendChatAction");
    expect(fetchBody(fetchMock)).toMatchObject({
      chat_id: "123",
      action: "typing"
    });
  });

  it("chunks inline buttons by requested layout columns", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ok: true, result: { message_id: 42 } })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendTelegramButtons(
      {
        AGENT_DB: createOutboundDb() as unknown as D1Database,
        TELEGRAM_BOT_TOKEN: "token"
      } as unknown as Env,
      "default",
      "telegram:123",
      "请选择",
      {
        buttons: [
          { label: "A", action: "agent.message" },
          { label: "B", action: "agent.message" },
          { label: "C", action: "agent.message" }
        ],
        layout: { columns: 2 }
      }
    );

    expect(result).toMatchObject({ ok: true, providerMessageId: "42" });
    expect(fetchBody(fetchMock).reply_markup).toEqual({
      inline_keyboard: [
        [
          { text: "A", callback_data: expect.stringMatching(/^cb_/) },
          { text: "B", callback_data: expect.stringMatching(/^cb_/) }
        ],
        [
          { text: "C", callback_data: expect.stringMatching(/^cb_/) }
        ]
      ]
    });
  });
});

function createOutboundDb() {
  return {
    prepare(sql: string) {
      const statement = {
        values: [] as unknown[],
        bind(...values: unknown[]) {
          statement.values = values;
          return statement;
        },
        async first() {
          return null;
        },
        async run() {
          if (sql.includes("INSERT INTO platform_callbacks")) {
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
      };
      return statement;
    }
  };
}

function fetchBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

function fetchUrl(fetchMock: ReturnType<typeof vi.fn>): string {
  const call = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
  return String(call[0]);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" }
  });
}
