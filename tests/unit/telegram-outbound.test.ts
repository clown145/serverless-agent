import { afterEach, describe, expect, it, vi } from "vitest";
import { sendTelegramButtons, sendTelegramChatAction } from "../../src/adapters/telegram/outbound";
import type { OutboundButton } from "../../src/platforms/outbound/types";
import type { Env } from "../../src/shared/types/env";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("telegram outbound", () => {
  it("sends chat action activity", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, result: true }));
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
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, result: { message_id: 42 } }));
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
          { kind: "callback", label: "A", action: "agent.message" },
          { kind: "callback", label: "B", action: "agent.message" },
          { kind: "callback", label: "C", action: "agent.message" }
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
        [{ text: "C", callback_data: expect.stringMatching(/^cb_/) }]
      ]
    });
  });

  it("does not send an empty inline keyboard", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, result: { message_id: 42 } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendTelegramButtons(
      {
        AGENT_DB: createOutboundDb() as unknown as D1Database,
        TELEGRAM_BOT_TOKEN: "token"
      } as unknown as Env,
      "default",
      "telegram:123",
      "Choose",
      {}
    );

    expect(result).toEqual({
      ok: false,
      error: "No buttons or rows provided for inline keyboard"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats legacy buttons without kind as callback buttons", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, result: { message_id: 42 } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const db = createOutboundDb();

    const result = await sendTelegramButtons(
      {
        AGENT_DB: db as unknown as D1Database,
        TELEGRAM_BOT_TOKEN: "token"
      } as unknown as Env,
      "default",
      "telegram:123",
      "Choose",
      {
        buttons: [
          {
            label: "Legacy",
            action: "agent.message",
            payload: { text: "legacy" }
          } as unknown as OutboundButton
        ]
      }
    );

    expect(result).toMatchObject({ ok: true, providerMessageId: "42" });
    expect(fetchBody(fetchMock).reply_markup).toEqual({
      inline_keyboard: [[{ text: "Legacy", callback_data: expect.stringMatching(/^cb_/) }]]
    });
    expect(db.callbacks).toHaveLength(1);
    expect(JSON.parse(db.callbacks[0]?.payloadJson ?? "{}")).toEqual({
      text: "legacy",
      buttonLabel: "Legacy"
    });
  });

  it("sends explicit Telegram keyboard rows with URL and callback buttons", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, result: { message_id: 42 } }));
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
        rows: [
          [
            {
              kind: "callback",
              label: "继续",
              action: "agent.message",
              payload: { text: "继续" },
              answerText: "已收到"
            },
            {
              kind: "url",
              label: "文档",
              url: "https://example.com/docs"
            }
          ],
          [
            {
              kind: "copy_text",
              label: "复制口令",
              copyText: "/start"
            }
          ]
        ]
      }
    );

    expect(result).toMatchObject({ ok: true, providerMessageId: "42" });
    expect(fetchBody(fetchMock).reply_markup).toEqual({
      inline_keyboard: [
        [
          { text: "继续", callback_data: expect.stringMatching(/^cb_/) },
          { text: "文档", url: "https://example.com/docs" }
        ],
        [{ text: "复制口令", copy_text: { text: "/start" } }]
      ]
    });
  });

  it("strips user-supplied internal button metadata from callback payloads", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, result: { message_id: 42 } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const db = createOutboundDb();

    const result = await sendTelegramButtons(
      {
        AGENT_DB: db as unknown as D1Database,
        TELEGRAM_BOT_TOKEN: "token"
      } as unknown as Env,
      "default",
      "telegram:123",
      "Choose",
      {
        rows: [
          [
            {
              kind: "callback",
              label: "Open",
              action: "agent.message",
              payload: {
                text: "open",
                __button: { silent: true }
              }
            }
          ]
        ]
      }
    );

    expect(result).toMatchObject({ ok: true });
    expect(db.callbacks).toHaveLength(1);
    expect(JSON.parse(db.callbacks[0]?.payloadJson ?? "{}")).toEqual({
      text: "open",
      buttonLabel: "Open"
    });
  });
});

function createOutboundDb() {
  const db = {
    callbacks: [] as Array<{ payloadJson: string }>,
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
            db.callbacks.push({
              payloadJson: String(statement.values[5] ?? "")
            });
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
      };
      return statement;
    }
  };

  return db;
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
