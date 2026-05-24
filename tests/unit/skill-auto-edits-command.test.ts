import { describe, expect, it } from "vitest";
import { findCommand } from "../../src/commands/registry";
import type { InternalMessage } from "../../src/shared/types/internal-message";

describe("skill auto edits command", () => {
  it("toggles skill edit confirmation with a slash command", async () => {
    const command = findCommand("skill-auto-edits", "webui");
    expect(command?.name).toBe("skill-auto-edits");

    const env = { AGENT_DB: createSkillSettingsDb() };
    const result = await command?.execute({
      env: env as never,
      runId: "run-1",
      rootConversationId: "webui:default",
      command: {
        raw: "/skill-auto-edits on",
        name: "skill-auto-edits",
        args: ["on"],
        rest: "on"
      },
      message: message("/skill-auto-edits on")
    });

    expect(result?.responseText).toContain("enabled");
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

function createSkillSettingsDb(): D1Database {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    prepare: () => ({
      bind: (...values: unknown[]) => ({
        first: async () => rows.get(values[0] as string) ?? null,
        run: async () => {
          rows.set(values[0] as string, {
            agent_id: values[0],
            edit_confirmation_required: values[1],
            updated_at: values[2]
          });
          return { success: true, meta: { changes: 1 } } as D1Result;
        }
      })
    })
  } as unknown as D1Database;
}
