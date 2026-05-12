import { describe, expect, it, vi } from "vitest";
import { handleTelegramCallbackQuery } from "../../src/adapters/telegram/callbacks/handler";
import type { TelegramCallbackQuery } from "../../src/adapters/telegram/types";
import type { Env } from "../../src/shared/types/env";
import type { PlatformCallbackRow } from "../../src/storage/repositories/platform-callbacks-types";

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

function query(data: string): TelegramCallbackQuery {
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
      date: 1760000000
    },
    data
  };
}
