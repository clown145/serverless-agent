import { describe, expect, it } from "vitest";
import { toConversationDto } from "../../src/worker/routes/conversations/conversation-dto";

describe("conversation dto", () => {
  it("adds session id and summary preview", () => {
    expect(
      toConversationDto({
        id: "conv-1",
        agentId: "default",
        conversationId: "telegram:123#work",
        platform: "telegram",
        rootConversationId: "telegram:123",
        historyLimit: 16,
        summaryEnabled: true,
        reasoningEffort: "auto",
        reasoningStateMode: "auto",
        summaryText: "a".repeat(200),
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      })
    ).toMatchObject({
      sessionId: "work",
      summaryPreview: `${"a".repeat(160)}...`
    });
  });
});
