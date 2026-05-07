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
