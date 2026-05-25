import { describe, expect, it } from "vitest";
import { createInitialModelMessages } from "../../src/core/agent-context";
import type { InternalMessage } from "../../src/shared/types/internal-message";

describe("agent context", () => {
  it("includes recent conversation history before model execution", () => {
    const messages = createInitialModelMessages(message("msg-2", "new"), undefined, [
      { id: "msg-1", role: "user", text: "old" },
      { id: "msg-a", role: "assistant", text: "answer" },
      { id: "msg-2", role: "user", text: "new" }
    ]);

    expect(messages.slice(-3)).toEqual([
      { role: "user", content: "old" },
      { role: "assistant", content: "answer" },
      { role: "user", content: "new" }
    ]);
  });

  it("appends the current message when history is empty", () => {
    expect(createInitialModelMessages(message("msg-1", "hello")).at(-1)).toEqual({
      role: "user",
      content: "hello"
    });
  });

  it("adds stable runtime context and platform formatting guidance", () => {
    const [system] = createInitialModelMessages(
      { ...message("msg-1", "hello"), platform: "telegram", conversationId: "telegram:123" },
      undefined,
      [],
      {
        timeZone: "Asia/Shanghai",
        platformFormatInstruction: [
          "Telegram formatting: messages are sent with Telegram parse_mode HTML by default.",
          "Use only Telegram-supported HTML tags."
        ].join("\n")
      }
    );

    expect(system.content).toContain("Configured timezone: Asia/Shanghai");
    expect(system.content).toContain("Current platform: telegram");
    expect(system.content).toContain("Current conversation: telegram:123");
    expect(system.content).not.toContain("Current time:");
    expect(system.content).not.toContain("Current time ISO:");
    expect(system.content).toContain("Use time.now to get the current date/time");
    expect(system.content).toContain("Telegram formatting");
    expect(system.content).toContain("parse_mode HTML");
  });

  it("adds skill catalog after stable system instructions", () => {
    const messages = createInitialModelMessages(message("msg-1", "hello"), undefined, [], {
      skillCatalog: [
        {
          id: "skill-creator",
          name: "skill-creator",
          description: "Create or update skills."
        }
      ]
    });

    expect(messages[0].content).toContain("You are serverless-agent");
    expect(messages[1]).toEqual({
      role: "system",
      content: [
        "Available skills. Use `/skill <id> <task>` when one of these skills is relevant; the full SKILL.md is loaded only after the skill is active.",
        "- skill-creator: Create or update skills."
      ].join("\n")
    });
  });
});

function message(id: string, text: string): InternalMessage {
  return {
    id,
    platform: "webui",
    platformMessageId: id,
    agentId: "default",
    conversationId: "webui:default",
    sender: {
      platformUserId: "webui-admin",
      role: "owner"
    },
    kind: "text",
    text,
    attachments: [],
    receivedAt: "2026-01-01T00:00:00.000Z"
  };
}
