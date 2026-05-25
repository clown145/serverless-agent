import { describe, expect, it } from "vitest";
import { ensureConversationSettings } from "../../src/storage/repositories/conversation-settings-repository";
import type { ConversationSettingsRow } from "../../src/storage/repositories/conversation-settings-types";

describe("conversation settings repository", () => {
  it("returns existing settings without inserting", async () => {
    const existing = conversationSettingsRow({ title: "Existing" });
    const db = createConversationSettingsDb({
      selectRows: [existing]
    });

    await expect(ensureConversationSettings(db, ensureInput())).resolves.toMatchObject({
      id: existing.id,
      title: "Existing"
    });
    expect(db.insertSql).toBeUndefined();
  });

  it("uses conflict-safe insert and returns the row created by a concurrent request", async () => {
    const concurrent = conversationSettingsRow({
      id: "conv_concurrent",
      title: "Concurrent"
    });
    const db = createConversationSettingsDb({
      selectRows: [undefined, concurrent]
    });

    await expect(ensureConversationSettings(db, ensureInput())).resolves.toMatchObject({
      id: "conv_concurrent",
      title: "Concurrent"
    });
    expect(db.insertSql).toContain("ON CONFLICT(agent_id, conversation_id) DO NOTHING");
  });
});

function ensureInput() {
  return {
    agentId: "agent-1",
    conversationId: "conversation-1",
    platform: "webui" as const,
    rootConversationId: "conversation-1",
    title: "New"
  };
}

function conversationSettingsRow(
  overrides: Partial<ConversationSettingsRow> = {}
): ConversationSettingsRow {
  return {
    id: "conv_existing",
    agent_id: "agent-1",
    conversation_id: "conversation-1",
    platform: "webui",
    root_conversation_id: "conversation-1",
    title: null,
    model_provider_id: null,
    model_id: null,
    history_limit: 16,
    summary_enabled: 1,
    summary_provider_id: null,
    summary_model_id: null,
    reasoning_effort: "auto",
    reasoning_state_mode: "auto",
    summary_text: null,
    summary_updated_at: null,
    compacted_until_message_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function createConversationSettingsDb(input: {
  selectRows: Array<ConversationSettingsRow | undefined>;
}): D1Database & { insertSql?: string } {
  const db = {
    insertSql: undefined as string | undefined,
    prepare(sql: string) {
      if (sql.includes("SELECT * FROM conversation_settings")) {
        return {
          bind: () => ({
            first: async () => input.selectRows.shift() ?? null
          })
        };
      }

      if (sql.includes("INSERT INTO conversation_settings")) {
        db.insertSql = sql;
        return {
          bind: () => ({
            run: async () => ({ success: true, meta: { changes: 0 } }) as D1Result
          })
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  return db as unknown as D1Database & { insertSql?: string };
}
