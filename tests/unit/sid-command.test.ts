import { describe, expect, it } from "vitest";
import { findCommand } from "../../src/commands/registry";
import type { InternalMessage } from "../../src/shared/types/internal-message";

describe("sid command", () => {
  it("returns IDs used by permission policies", async () => {
    const command = findCommand("whoami", "qq");
    expect(command?.name).toBe("sid");

    const result = await command?.execute({
      env: {} as never,
      runId: "run-1",
      rootConversationId: "qq:group:g-open",
      command: {
        raw: "/sid",
        name: "sid",
        args: [],
        rest: ""
      },
      message: {
        id: "msg-1",
        platform: "qq",
        platformMessageId: "qq-msg-1",
        agentId: "default",
        conversationId: "qq:group:g-open#topic",
        sender: {
          platformUserId: "member-openid",
          role: "unknown"
        },
        kind: "command",
        text: "/sid",
        attachments: [],
        receivedAt: "2026-05-21T00:00:00.000Z"
      } satisfies InternalMessage
    });

    expect(result?.responseText).toContain("conversationId: `qq:group:g-open#topic`");
    expect(result?.responseText).toContain("rootConversationId: `qq:group:g-open`");
    expect(result?.responseText).toContain("user / `member-openid`");
    expect(result?.responseText).toContain("conversation / `qq:group:g-open#topic`");
    expect(result?.responseText).toContain("conversation / `qq:group:g-open`");
  });
});
