import { describe, expect, it } from "vitest";
import { findCommand } from "../../src/commands/registry";
import type { InternalMessage } from "../../src/shared/types/internal-message";
import type { ConversationSettingsRow } from "../../src/storage/repositories/conversation-settings-types";

describe("think command", () => {
  it("updates reasoning effort and state settings", async () => {
    const command = findCommand("think", "webui");
    expect(command?.name).toBe("think");

    const env = { AGENT_DB: createConversationDb() };
    const effort = await command?.execute({
      env: env as never,
      runId: "run-1",
      rootConversationId: "webui:default",
      command: {
        raw: "/think high",
        name: "think",
        args: ["high"],
        rest: "high"
      },
      message: message("/think high")
    });
    const state = await command?.execute({
      env: env as never,
      runId: "run-2",
      rootConversationId: "webui:default",
      command: {
        raw: "/think state on",
        name: "think",
        args: ["state", "on"],
        rest: "state on"
      },
      message: message("/think state on")
    });
    const show = await command?.execute({
      env: env as never,
      runId: "run-3",
      rootConversationId: "webui:default",
      command: {
        raw: "/think",
        name: "think",
        args: [],
        rest: ""
      },
      message: message("/think")
    });

    expect(effort?.responseText).toContain("high");
    expect(state?.responseText).toContain("on");
    expect(show?.responseText).toContain("Effort: `high`");
    expect(show?.responseText).toContain("State round-trip: `on`");
  });
});

function message(text: string): InternalMessage {
  return {
    id: "msg-1",
    platform: "webui",
    platformMessageId: "msg-1",
    agentId: "default",
    conversationId: "webui:default",
    sender: {
      platformUserId: "admin",
      role: "owner"
    },
    kind: "command",
    text,
    attachments: [],
    receivedAt: "2026-05-23T00:00:00.000Z"
  };
}

function createConversationDb(): D1Database {
  let row: ConversationSettingsRow = {
    id: "conv_1",
    agent_id: "default",
    conversation_id: "webui:default",
    platform: "webui",
    root_conversation_id: "webui:default",
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
    updated_at: "2026-01-01T00:00:00.000Z"
  };

  return {
    prepare(sql: string) {
      return {
        bind: (...values: unknown[]) => ({
          first: async () => row,
          run: async () => {
            if (sql.includes("UPDATE conversation_settings")) {
              row = {
                ...row,
                title: values[0] as string | null,
                model_provider_id: values[1] as string | null,
                model_id: values[2] as string | null,
                history_limit: values[3] as number,
                summary_enabled: values[4] as number,
                summary_provider_id: values[5] as string | null,
                summary_model_id: values[6] as string | null,
                reasoning_effort: values[7] as string,
                reasoning_state_mode: values[8] as string,
                updated_at: values[9] as string
              };
            }
            return { success: true, meta: { changes: 1 } } as D1Result;
          }
        })
      };
    }
  } as unknown as D1Database;
}
