import { afterEach, describe, expect, it, vi } from "vitest";
import { handleTelegramCallbackQuery } from "../../src/adapters/telegram/callbacks/handler";
import type { TelegramCallbackQuery } from "../../src/adapters/telegram/types";
import type { Env } from "../../src/shared/types/env";
import type { PlatformCallbackRow } from "../../src/storage/repositories/platform-callbacks-types";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("telegram callbacks", () => {
  it("turns agent.message callbacks into inbound queue jobs", async () => {
    const queue = { send: vi.fn(async () => undefined) };
    const db = createCallbackDb([
      callbackRow({
        id: "cb_agent",
        action: "agent.message",
        payload_json: JSON.stringify({ text: "继续" })
      })
    ]);

    const result = await handleTelegramCallbackQuery(
      {
        AGENT_DB: db as unknown as D1Database,
        AGENT_QUEUE: queue
      } as unknown as Env,
      {
        agentId: "default",
        query: query("cb_agent")
      },
      undefined
    );

    expect(result.handled).toBe(true);
    expect(queue.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "inbound.message",
        message: expect.objectContaining({
          text: "继续",
          conversationId: "telegram:123"
        })
      })
    );
    expect(db.used).toEqual(["cb_agent"]);
  });

  it("uses the clicked button label when payload text is omitted", async () => {
    const queue = { send: vi.fn(async () => undefined) };
    const db = createCallbackDb([
      callbackRow({
        id: "cb_label",
        action: "agent.message",
        payload_json: JSON.stringify({})
      })
    ]);

    await handleTelegramCallbackQuery(
      {
        AGENT_DB: db as unknown as D1Database,
        AGENT_QUEUE: queue
      } as unknown as Env,
      {
        agentId: "default",
        query: query("cb_label", "继续搜索")
      },
      undefined
    );

    expect(queue.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          text: "继续搜索"
        })
      })
    );
  });

  it("supports reusable silent callbacks and Telegram UI effects", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, result: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const queue = { send: vi.fn(async () => undefined) };
    const db = createCallbackDb([
      callbackRow({
        id: "cb_silent",
        action: "agent.message",
        payload_json: JSON.stringify({
          text: "不要入队",
          __button: {
            reuse: true,
            silent: true,
            answerText: "已处理",
            showAlert: true,
            removeKeyboardOnClick: true
          }
        })
      })
    ]);

    const result = await handleTelegramCallbackQuery(
      {
        AGENT_DB: db as unknown as D1Database,
        AGENT_QUEUE: queue
      } as unknown as Env,
      {
        agentId: "default",
        query: query("cb_silent", "静默")
      },
      "token"
    );

    expect(result.handled).toBe(true);
    expect(queue.send).not.toHaveBeenCalled();
    expect(db.used).toEqual([]);
    expect(fetchUrl(fetchMock, 0)).toContain("/bottoken/editMessageReplyMarkup");
    expect(fetchBody(fetchMock, 0)).toMatchObject({
      chat_id: 123,
      message_id: 10,
      reply_markup: { inline_keyboard: [] }
    });
    expect(fetchUrl(fetchMock, 1)).toContain("/bottoken/answerCallbackQuery");
    expect(fetchBody(fetchMock, 1)).toMatchObject({
      callback_query_id: "query_1",
      text: "已处理",
      show_alert: true
    });
  });

  it("does not require message text for silent callbacks", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, result: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const queue = { send: vi.fn(async () => undefined) };
    const db = createCallbackDb([
      callbackRow({
        id: "cb_silent_no_text",
        action: "agent.message",
        payload_json: JSON.stringify({
          __button: {
            silent: true,
            answerText: "已关闭",
            removeKeyboardOnClick: true
          }
        })
      })
    ]);

    const result = await handleTelegramCallbackQuery(
      {
        AGENT_DB: db as unknown as D1Database,
        AGENT_QUEUE: queue
      } as unknown as Env,
      {
        agentId: "default",
        query: query("cb_silent_no_text")
      },
      "token"
    );

    expect(result).toEqual({ handled: true });
    expect(queue.send).not.toHaveBeenCalled();
    expect(db.used).toEqual(["cb_silent_no_text"]);
    expect(fetchUrl(fetchMock, 0)).toContain("/bottoken/editMessageReplyMarkup");
    expect(fetchUrl(fetchMock, 1)).toContain("/bottoken/answerCallbackQuery");
    expect(fetchBody(fetchMock, 1)).toMatchObject({
      text: "已关闭"
    });
  });
});

function createCallbackDb(rows: PlatformCallbackRow[]) {
  const callbacks = new Map(rows.map((row) => [row.id, { ...row }]));
  const db = {
    used: [] as string[],
    prepare(sql: string) {
      const statement = {
        values: [] as unknown[],
        bind(...values: unknown[]) {
          statement.values = values;
          return statement;
        },
        async first() {
          return callbacks.get(statement.values[0] as string) ?? null;
        },
        async run() {
          if (sql.includes("SET status = 'used'")) {
            const id = statement.values[2] as string;
            const row = callbacks.get(id);
            if (row && row.status === "active") {
              row.status = "used";
              row.used_at = statement.values[0] as string;
              row.updated_at = statement.values[1] as string;
              db.used.push(id);
              return { meta: { changes: 1 } };
            }
          }
          return { meta: { changes: 0 } };
        }
      };
      return statement;
    }
  };
  return db;
}

function callbackRow(overrides: Partial<PlatformCallbackRow> = {}): PlatformCallbackRow {
  return {
    id: "cb_1",
    agent_id: "default",
    platform: "telegram",
    conversation_id: "telegram:123",
    action: "agent.message",
    payload_json: "{}",
    status: "active",
    expires_at: "2999-01-01T00:00:00.000Z",
    created_at: "2026-05-12T00:00:00.000Z",
    updated_at: "2026-05-12T00:00:00.000Z",
    used_at: null,
    ...overrides
  };
}

function query(data: string, label?: string): TelegramCallbackQuery {
  return {
    id: "query_1",
    from: {
      id: 789,
      first_name: "Ada"
    },
    message: {
      message_id: 10,
      chat: {
        id: 123,
        type: "private"
      },
      date: 1760000000,
      reply_markup: label
        ? {
            inline_keyboard: [
              [
                {
                  text: label,
                  callback_data: data
                }
              ]
            ]
          }
        : undefined
    },
    data
  };
}

function fetchBody(fetchMock: ReturnType<typeof vi.fn>, index: number): Record<string, unknown> {
  const init = fetchMock.mock.calls[index]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

function fetchUrl(fetchMock: ReturnType<typeof vi.fn>, index: number): string {
  const call = fetchMock.mock.calls[index] as unknown as [RequestInfo | URL, RequestInit];
  return String(call[0]);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" }
  });
}
